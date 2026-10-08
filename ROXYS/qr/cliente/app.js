let pedidos=[];
const $=id=>document.getElementById(id);
const money=n=>"S/. "+Number(n||0).toFixed(2);

async function cargar(){
  try{
    const r=await fetch(ROXY_BACKEND+"?accion=PEDIDOS&_="+Date.now(),{cache:"no-store"});
    const j=await r.json();
    if(j.estado!=="OK") throw new Error(j.mensaje||"Error");
    pedidos=j.pedidos||[];
    render();
  }catch(e){
    $("lista").innerHTML='<div class="vacio">No se pudo conectar con el backend.</div>';
  }
}

function render(){
  const visibles=pedidos;
  $("pendientes").textContent=visibles.filter(p=>p.estadoPago==="PENDIENTE"&&p.estadoPedido!=="CANCELADO").length;
  $("pagados").textContent=visibles.filter(p=>p.estadoPago==="PAGADO").length;
  $("monto").textContent=money(visibles.reduce((a,p)=>a+p.total,0));

  if(!visibles.length){
    $("lista").innerHTML='<div class="vacio">No hay pedidos registrados.</div>';
    return;
  }

  $("lista").innerHTML="";

  visibles.forEach(p=>{
    const el=document.createElement("article");
    el.className="pedido";

    const items=p.items.map(i=>`<div class="item"><span>${i.nombreProducto} × ${i.cantidad}</span><strong>${money(i.subtotal)}</strong></div>`).join("");

    let acciones="";

    if(p.estadoPago==="PENDIENTE"){
      acciones+=`
        <select class="estado-pago" data-pago="${p.idPedido}">
          <option value="">Estado del pago</option>
          <option value="PAGADO">🟢 PAGADO</option>
          <option value="PAGO RECHAZADO">🔴 PAGO RECHAZADO</option>
        </select>
      `;
    }

    if(p.estadoPago==="PAGADO"&&p.estadoPedido==="CONFIRMADO"){
      acciones+=`<button data-e="EN PREPARACIÓN">Preparar</button>`;
    }

    if(p.estadoPedido==="EN PREPARACIÓN"){
      acciones+=`<button data-e="LISTO" class="verde">Marcar listo</button>`;
    }

    if(p.estadoPedido==="LISTO"){
      acciones+=`<button data-e="ENTREGADO" class="verde">Entregado</button>`;
    }

    if(!["ENTREGADO","CANCELADO"].includes(p.estadoPedido)){
      acciones+=`<button data-e="CANCELADO" class="rojo">Cancelar</button>`;
    }

    el.innerHTML=`
      <div class="cabecera">
        <div>
          <div class="id">${p.idPedido}</div>
          <div class="meta">${p.nombreCliente} · ${p.fecha} ${p.hora}</div>
        </div>
        <div class="estado">${p.estadoPedido}</div>
      </div>

      <div class="meta">Pago: ${p.metodoPago} · ${p.estadoPago}${p.ticket?" · Ticket "+p.ticket:""}</div>

      <div class="items">${items}</div>

      <div class="meta"><strong>Total ${money(p.total)}</strong></div>

      <div class="acciones">${acciones}</div>
    `;

    el.querySelector('[data-pago]')?.addEventListener("change",e=>{
      const estado=e.target.value;
      if(estado) cambiarEstadoPago(p.idPedido,estado);
    });

    el.querySelectorAll("[data-e]").forEach(b=>{
      b.addEventListener("click",()=>cambiarEstado(p.idPedido,b.dataset.e));
    });

    $("lista").appendChild(el);
  });
}

async function cambiarEstadoPago(idPedido,estadoPago){
  try{
    const r=await fetch(ROXY_BACKEND,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({
        accion:"CAMBIAR_ESTADO_PAGO",
        idPedido:idPedido,
        estadoPago:estadoPago,
        usuario:"CAJERO"
      })
    });

    const j=await r.json();

    if(j.estado!=="OK"){
      alert(j.mensaje||"No se pudo actualizar el estado del pago.");
      cargar();
      return;
    }

    cargar();
  }catch(e){
    alert("No se pudo conectar con el backend.");
    cargar();
  }
}

async function cambiarEstado(id,estado){
  const r=await fetch(ROXY_BACKEND,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({
      accion:"CAMBIAR_ESTADO_PEDIDO",
      idPedido:id,
      estadoPedido:estado,
      usuario:"CAJERO"
    })
  });

  const j=await r.json();

  if(j.estado!=="OK"){
    alert(j.mensaje||"No se pudo actualizar");
    return;
  }

  cargar();
}

$("actualizar").onclick=cargar;

cargar();

setInterval(cargar,5000);