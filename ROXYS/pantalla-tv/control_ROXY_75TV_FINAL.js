const URL_BACKEND="https://script.google.com/macros/s/AKfycbzQP4WqX-cyj9kX1Cw52yNM_QT15ArTPo9Zq7buVJUXuUKOSTfcLeDcaZ6UktaPU2qiUQ/exec";
const INTERVALO_CARRUSEL=10000;
const INTERVALO_ACTUALIZACION=5000;
const TAMANO_PREPARACION=5;

const CATEGORIAS={
 "CAT-001":{nombre:"FRUTAS NATURALES"},
 "CAT-002":{nombre:"LECHE C/ FRUTAS"},
 "CAT-003":{nombre:"ESPECIALES ROXY"}
};

let productos=[];
let categoriaCarrusel=0;
let productoCarrusel=0;
let paginaPreparacion=0;
let timerCarrusel=null;
let timerRefresh=null;
let actualizando=false;
let ultimaFirma="";
let eventos={};
let ultimaConexion=false;

const $=selector=>document.querySelector(selector);
const $$=selector=>document.querySelectorAll(selector);
const normalizar=v=>String(v??"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const disponible=p=>normalizar(p.estado)==="DISPONIBLE";
const preparacion=p=>normalizar(p.estado)==="EN PREPARACION";
const agotado=p=>normalizar(p.estado)==="AGOTADO";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const disponibles=id=>productos.filter(p=>p.idCategoria===id&&disponible(p));

function crearIndicadorConexion(){
 let indicador=$("#estadoConexion");
 if(indicador)return indicador;
 indicador=document.createElement("div");
 indicador.id="estadoConexion";
 Object.assign(indicador.style,{
  position:"fixed",
  right:"20px",
  bottom:"15px",
  zIndex:"99999",
  padding:"6px 14px",
  borderRadius:"20px",
  background:"rgba(0,0,0,.85)",
  color:"#fff",
  fontFamily:"Montserrat,sans-serif",
  fontSize:"11px",
  fontWeight:"800",
  opacity:"0",
  transform:"translateY(10px)",
  transition:"all .35s ease",
  pointerEvents:"none",
  border:"1px solid #ffcc00"
 });
 document.body.appendChild(indicador);
 return indicador;
}

function mostrarConexion(online,forzar=false){
 const indicador=crearIndicadorConexion();
 if(online){
  indicador.textContent="● TV CONECTADA";
  indicador.style.background="rgba(0,150,60,.92)";
  indicador.style.opacity=forzar?"1":"0";
  indicador.style.transform=forzar?"translateY(0)":"translateY(10px)";
  if(forzar)setTimeout(()=>{
   if(ultimaConexion){
    indicador.style.opacity="0";
    indicador.style.transform="translateY(10px)";
   }
  },2200);
 }else{
  indicador.textContent="● REINTENTANDO CONEXIÓN...";
  indicador.style.background="rgba(204,0,0,.92)";
  indicador.style.opacity="1";
  indicador.style.transform="translateY(0)";
 }
 ultimaConexion=online;
}

function crearCard(p,modo="normal"){
 const card=document.createElement("article");
 card.className="product-card";
 card.innerHTML=`
  <div class="product-icon">${esc(p.icono||"🍧")}</div>
  <div class="product-info">
   <div class="product-name">${esc(p.nombre||"SABOR ROXY")}</div>
   <div class="product-cat">${esc(CATEGORIAS[p.idCategoria]?.nombre||"ROXY")}</div>
  </div>
  ${modo==="preparacion"?'<span class="product-status">EN PREPARACIÓN</span>':""}
 `;
 return card;
}

function renderPreparacion(){
 const grid=$("#grid-preparacion");
 const lista=productos.filter(preparacion);
 const total=Math.max(1,Math.ceil(lista.length/TAMANO_PREPARACION));
 if(paginaPreparacion>=total)paginaPreparacion=0;
 const inicio=paginaPreparacion*TAMANO_PREPARACION;
 const visibles=lista.slice(inicio,inicio+TAMANO_PREPARACION);
 const count=$("#count-preparacion");
 if(count)count.textContent=lista.length;
 if(!grid)return;
 grid.innerHTML="";
 if(!visibles.length){
  grid.innerHTML='<div class="empty-category"><span>NINGÚN PRODUCTO EN PREPARACIÓN</span></div>';
  return;
 }
 visibles.forEach((p,i)=>{
  const card=crearCard(p,"preparacion");
  card.style.animationDelay=`${i*55}ms`;
  grid.appendChild(card);
 });
}

function obtenerEstadoCarrusel(){
 const ids=["CAT-001","CAT-002","CAT-003"];
 const id=ids[categoriaCarrusel];
 const lista=disponibles(id);
 if(productoCarrusel>=lista.length)productoCarrusel=0;
 return {id,lista};
}

function renderRiceDelite(id,lista){
 const box=$("#riceCarouselProducts");
 const title=$("#riceDynamicTitle");
 const count=$("#count-CAT-003");
 if(!box||!title)return;
 title.textContent=CATEGORIAS[id].nombre;
 if(count)count.textContent=lista.length;
 box.innerHTML="";
 if(!lista.length){
  box.innerHTML='<div class="empty-category"><span>NO HAY SABORES DISPONIBLES</span></div>';
  return;
 }
 lista.forEach((p,i)=>{
  const card=crearCard(p);
  if(i===productoCarrusel)card.classList.add("rice-product-active");
  card.style.animationDelay=`${i*35}ms`;
  box.appendChild(card);
 });
}

function renderHeroCarrusel(animar=true){
 const track=$("#heroCarouselTrack");
 const name=$("#heroCarouselName");
 const category=$("#heroCarouselCategory");
 const dots=$("#heroCarouselDots");
 const footer=$("#heroCategoryFooter");
 const footerText=$("#heroFooterText");
 if(!track||!name||!category||!dots)return;

 const estado=obtenerEstadoCarrusel();
 const id=estado.id;
 const lista=estado.lista;

 category.textContent=CATEGORIAS[id].nombre;
 if(footer)footer.textContent=CATEGORIAS[id].nombre;
 if(footerText)footerText.textContent=`CARRUSEL ACTUAL: ${CATEGORIAS[id].nombre}`;

 dots.innerHTML=Array.from({length:Math.min(lista.length,10)},(_,i)=>`<span class="hero-carousel-dot ${i===productoCarrusel?"active":""}"></span>`).join("");

 if(!lista.length){
  track.innerHTML='<div class="hero-carousel-product"><div class="hero-carousel-product-icon">🍧</div><div class="hero-carousel-product-name">SIN SABORES DISPONIBLES</div></div>';
  name.textContent="SIN PRODUCTOS DISPONIBLES";
  renderRiceDelite(id,[]);
  return;
 }

 const producto=lista[productoCarrusel];

 track.innerHTML=`
  <div class="hero-carousel-product ${animar?"hero-slide-in":""}">
   <div class="hero-carousel-product-icon">${esc(producto.icono||"🍧")}</div>
   <div class="hero-carousel-product-name">${esc(producto.nombre||"SABOR ROXY")}</div>
  </div>
 `;

 name.textContent=producto.nombre||"SABOR ROXY";
 renderRiceDelite(id,lista);
}

function renderMiniCategorias(){
 const ids=["CAT-001","CAT-002","CAT-003"];
 ids.forEach(id=>{
  const grid=$(`#grid-${id}`);
  const count=$(`#count-${id}`);
  const lista=disponibles(id);
  if(count)count.textContent=lista.length;
  if(!grid)return;
  grid.innerHTML="";
  lista.slice(0,8).forEach((p,i)=>{
   const card=crearCard(p);
   card.style.animationDelay=`${i*35}ms`;
   grid.appendChild(card);
  });
  if(!lista.length)grid.innerHTML='<div class="empty-category"><span>SIN SABORES DISPONIBLES</span></div>';
 });
}

function renderTodo(){
 renderMiniCategorias();
 renderPreparacion();
 renderHeroCarrusel(false);
 const total=productos.filter(disponible).length;
 $$("#totalDisponibles").forEach(el=>el.textContent=total);
}

function detectarTransiciones(nuevos){
 const anterior=new Map(productos.map(p=>[p.idProducto,p]));
 nuevos.forEach(p=>{
  const viejo=anterior.get(p.idProducto);
  if(!viejo)return;
  const a=normalizar(viejo.estado);
  const b=normalizar(p.estado);
  if(a==="AGOTADO"&&b==="EN PREPARACION"){
   const product=$("#eventProduct");
   const icon=$("#eventIcon");
   const overlay=$("#eventOverlay");
   if(overlay){
    if(product)product.textContent=p.nombre||"Sabor";
    if(icon)icon.textContent=p.icono||"🍧";
    overlay.hidden=false;
    clearTimeout(eventos[p.idProducto]);
    eventos[p.idProducto]=setTimeout(()=>overlay.hidden=true,6000);
   }
  }
 });
}

function firma(lista){
 return lista.map(p=>[p.idProducto,p.nombre,p.idCategoria,p.estado,p.icono].join("|")).join("||");
}

async function cargarProductos(){
 if(actualizando)return;
 actualizando=true;
 try{
  const r=await fetch(`${URL_BACKEND}?accion=PRODUCTOS&_=${Date.now()}`,{
   method:"GET",
   cache:"no-store",
   mode:"cors",
   credentials:"omit",
   headers:{Accept:"application/json"}
  });
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const data=await r.json();
  if(data.estado!=="OK")throw new Error(data.mensaje||"Respuesta inválida");
  const nuevos=Array.isArray(data.productos)?data.productos:[];
  detectarTransiciones(nuevos);
  const nuevaFirma=firma(nuevos);
  const cambio=nuevaFirma!==ultimaFirma;
  ultimaFirma=nuevaFirma;
  productos=nuevos;
  if(cambio)renderTodo();
  mostrarConexion(true,true);
  const tvError=$("#tvError");
  if(tvError)tvError.hidden=true;
 }catch(e){
  console.error("Error al sincronizar TV:",e);
  mostrarConexion(false,false);
 }finally{
  actualizando=false;
  const tvLoading=$("#tvLoading");
  if(tvLoading)tvLoading.hidden=true;
 }
}

function avanzarCarrusel(){
 const estado=obtenerEstadoCarrusel();
 if(estado.lista.length){
  productoCarrusel++;
  if(productoCarrusel>=estado.lista.length){
   productoCarrusel=0;
   categoriaCarrusel=(categoriaCarrusel+1)%3;
  }
 }else{
  productoCarrusel=0;
  categoriaCarrusel=(categoriaCarrusel+1)%3;
 }
 renderHeroCarrusel(true);
 renderPreparacion();
}

function avanzarPreparacion(){
 const lista=productos.filter(preparacion);
 const total=Math.max(1,Math.ceil(lista.length/TAMANO_PREPARACION));
 paginaPreparacion=(paginaPreparacion+1)%total;
 renderPreparacion();
}

function reloj(){
 const elemento=$("#hora");
 if(!elemento)return;
 const d=new Date();
 elemento.textContent=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

document.addEventListener("DOMContentLoaded",async()=>{
 reloj();
 setInterval(reloj,1000);
 crearIndicadorConexion();
 await cargarProductos();
 renderTodo();
 timerCarrusel=setInterval(avanzarCarrusel,INTERVALO_CARRUSEL);
 setInterval(avanzarPreparacion,INTERVALO_CARRUSEL);
 timerRefresh=setInterval(cargarProductos,INTERVALO_ACTUALIZACION);
});

window.addEventListener("beforeunload",()=>{
 clearInterval(timerCarrusel);
 clearInterval(timerRefresh);
});
