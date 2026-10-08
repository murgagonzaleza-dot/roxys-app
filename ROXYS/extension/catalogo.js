const URL_BACKEND="https://script.google.com/macros/s/AKfycbwe05nXJvFHFccc80P0RhugUPZcyMBbIdd4JVAUvdeNVLgyTRR3OlvWeVk-Q0yExI-nOA/exec";
const $=id=>document.getElementById(id);
let productos=[];
let filtro="TODAS";
let seleccionado=null;

function normalizar(v){return String(v??"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function categoriaNombre(id){return {"CAT-001":"🍓 Frutas Naturales","CAT-002":"🥛 Leche c/ Frutas","CAT-003":"⭐ Especiales Roxy"}[id]||id}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function disponibles(){return productos.filter(p=>normalizar(p.estado)==="DISPONIBLE"&&normalizar(p.activo||"SI")!=="NO")}
function render(){
 const grid=$("catalogGrid"); if(!grid)return;
 const lista=disponibles().filter(p=>filtro==="TODAS"||p.idCategoria===filtro);
 grid.innerHTML="";
 if(!lista.length){grid.innerHTML='<div class="empty">🍧 No hay sabores disponibles en este momento.</div>';return}
 lista.forEach(p=>{
  const card=document.createElement("article");card.className="product-card"+(seleccionado?.idProducto===p.idProducto?" selected":"");
  card.innerHTML=`<div class="product-icon">${escapeHtml(p.icono||"🍧")}</div><div class="product-info"><small>${escapeHtml(categoriaNombre(p.idCategoria))}</small><strong>${escapeHtml(p.nombre||"Producto")}</strong><span class="available">● DISPONIBLE</span></div>`;
  card.addEventListener("click",()=>{seleccionado=p;render();actualizarPedido()});
  grid.appendChild(card);
 })
}
function actualizarPedido(){
 const panel=$("orderPanel");
 if(!seleccionado){panel.hidden=true;return}
 panel.hidden=false;$("selectedProduct").textContent=seleccionado.nombre||"Producto";$("selectedCategory").textContent=categoriaNombre(seleccionado.idCategoria)
}
async function cargar(){
 try{
  const r=await fetch(URL_BACKEND+"?accion=PRODUCTOS&_="+Date.now(),{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const data=await r.json();
  if(data.estado!=="OK")throw new Error(data.mensaje||"No se pudo cargar el catálogo");
  productos=Array.isArray(data.productos)?data.productos:[];
  render();actualizarPedido();$("catalogMessage").textContent=`${disponibles().length} sabores disponibles`;
 }catch(e){console.error(e);$("catalogMessage").textContent="No se pudo actualizar el catálogo. Intenta nuevamente."}
}
document.querySelectorAll(".category-tabs button").forEach(b=>b.addEventListener("click",()=>{filtro=b.dataset.cat||"TODAS";document.querySelectorAll(".category-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()}));
$("btnEnviarPedido").addEventListener("click",async()=>{
 const nombre=$("clienteNombre").value.trim();
 if(!nombre){$("catalogMessage").textContent="Escribe tu nombre completo antes de realizar el pedido.";return}
 if(!seleccionado){$("catalogMessage").textContent="Selecciona un producto.";return}
 $("btnEnviarPedido").disabled=true;
 $("catalogMessage").textContent="Enviando pedido...";
 try{
  const r=await fetch(URL_BACKEND,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({accion:"CREAR_PEDIDO",nombreCliente:nombre,idProducto:seleccionado.idProducto,nombreProducto:seleccionado.nombre,idCategoria:seleccionado.idCategoria})});
  const data=await r.json();
  if(data.estado!=="OK")throw new Error(data.mensaje||"No se pudo registrar el pedido.");
  $("catalogMessage").textContent=data.mensaje||"Pedido registrado correctamente.";
  seleccionado=null;render();actualizarPedido();
 }catch(e){$("catalogMessage").textContent=e.message||"No se pudo registrar el pedido."}
 finally{$("btnEnviarPedido").disabled=false}
});
let temaRoxyActual="auto";

function temaAutomatico(){
 const mes=new Date().getMonth()+1;
 return {
  10:"halloween",
  12:"navidad",
  2:"amor",
  5:"madre",
  6:"padre"
 }[mes]||"auto";
}

function aplicarTemaCatalogo(tema){
 const configurado=String(tema||"auto").toLowerCase();
 const activo=configurado==="auto"?temaAutomatico():configurado;

 temaRoxyActual=configurado;

 document.body.dataset.theme=activo;

 if($("seasonBadge")){
  $("seasonBadge").textContent=
   activo==="halloween"
   ?"🎃 Halloween"
   :activo==="navidad"
   ?"🎄 Navidad"
   :activo==="amor"
   ?"❤️ Día del Amor"
   :activo==="madre"
   ?"🌷 Día de la Madre"
   :activo==="padre"
   ?"👔 Día del Padre"
   :"Temporada Roxy";
 }
}

async function cargarTemaRoxy(){

 try{

  const r=await fetch(
   URL_BACKEND+
   "?accion=CONFIG&_="+
   Date.now(),
   {
    method:"GET",
    cache:"no-store"
   }
  );

  if(!r.ok){
   throw new Error("HTTP "+r.status);
  }

  const data=await r.json();

  if(data.estado!=="OK"){
   throw new Error(
    data.mensaje||
    "No se pudo cargar la temática."
   );
  }

  const tema=
   data.config?.TEMA_ACTUAL||
   "auto";

  aplicarTemaCatalogo(tema);

 }catch(e){

  console.error(
   "Error cargando temática:",
   e
  );

  aplicarTemaCatalogo("auto");

 }
}
cargarTemaRoxy();
cargar();

setInterval(()=>{
 cargarTemaRoxy();
 cargar();
},10000);