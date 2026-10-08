let pedidos=[];
const $=id=>document.getElementById(id);
const money=n=>"S/. "+Number(n||0).toFixed(2);

function esc(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

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

function clasePago(estado){
  if(estado==="PAGADO") return "pago-pagado";
  if(estado==="PAGO RECHAZADO") return "pago-rechazado";
  return "pago-pendiente";
}

function clasePedido(estado){
  return String(estado||"").toLowerCase().replaceAll(" ","-");
}

function render(){
  const visibles=pedidos.filter(p=>p.estadoPedido!=="CANCELADO");

  $("pendientes").textContent=visibles.filter(p=>p.estadoPago==="PENDIENTE").length;
  $("pagados").textContent=visibles.filter(p=>p.estadoPago==="PAGADO").length;
  $("monto").textContent=money(visibles.reduce((a,p)=>a+Number(p.total||0),0));

  if(!visibles.length){
    $("lista").innerHTML='<div class="vacio">No hay pedidos registrados.</div>';
    return;
  }

  $("lista").innerHTML=`
    <div class="tabla-contenedor">
      <table class="tabla-pedidos">
        <thead>
          <tr>
            <th>PEDIDO</th>
            <th>CLIENTE</th>
            <th>FECHA / HORA</th>
            <th>PRODUCTOS</th>
            <th>TOTAL</th>
            <th>MÉTODO</th>
            <th>PAGO</th>
            <th>TICKET</th>
            <th>ESTADO</th>
            <th>ACCIÓN</th>
          </tr>
        </thead>
        <tbody>
          ${visibles.map(p=>filaPedido(p)).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll("[data-pago]").forEach(button=>{
    button.addEventListener("click",()=>{
      cambiarEstadoPago(button.dataset.pago,button.dataset.estado);
    });
  });

  document.querySelectorAll("[data-e]").forEach(button=>{
    button.addEventListener("click",()=>{
      cambiarEstado(button.dataset.e,button.dataset.estado);
    });
  });
}

function filaPedido(p){
  const productos=(p.items||[]).map(i=>`${esc(i.nombreProducto)} × ${Number(i.cantidad||0)}`).join("<br>");

  let pagoHtml="";
  let accionHtml="";

  if(p.estadoPago==="PENDIENTE"){
    pagoHtml='<span class="badge pago-pendiente">🟡 PENDIENTE</span>';
    accionHtml=`
      <div class="acciones-pago">
        <button class="btn-pagado" data-pago="${esc(p.idPedido)}" data-estado="PAGADO">🟢 PAGADO</button>
        <button class="btn-rechazado" data-pago="${esc(p.idPedido)}" data-estado="PAGO RECHAZADO">🔴 RECHAZAR</button>
      </div>
    `;
  }else if(p.estadoPago==="PAGADO"){
    pagoHtml='<span class="badge pago-pagado">🟢 PAGADO</span>';
  }else{
    pagoHtml='<span class="badge pago-rechazado">🔴 PAGO RECHAZADO</span>';
  }

  if(p.estadoPago==="PAGADO"){
    if(p.estadoPedido==="CONFIRMADO"){
      accionHtml='<button class="btn-preparar" data-e="'+esc(p.idPedido)+'" data-estado="EN PREPARACIÓN">PREPARAR</button>';
    }else if(p.estadoPedido==="EN PREPARACIÓN"){
      accionHtml='<button class="btn-listo" data-e="'+esc(p.idPedido)+'" data-estado="LISTO">MARCAR LISTO</button>';
    }else if(p.estadoPedido==="LISTO"){
      accionHtml='<button class="btn-entregado" data-e="'+esc(p.idPedido)+'" data-estado="ENTREGADO">ENTREGADO</button>';
    }else if(p.estadoPedido==="ENTREGADO"){
      accionHtml='<span class="accion-finalizada">✓ ENTREGADO</span>';
    }
  }else if(p.estadoPago==="PAGO RECHAZADO"){
    accionHtml='<span class="accion-finalizada rechazado-texto">SIN TICKET</span>';
  }

  return `
    <tr>
      <td>
        <strong class="pedido-id">${esc(p.idPedido)}</strong>
      </td>
      <td>
        <strong>${esc(p.nombreCliente)}</strong>
      </td>
      <td>
        ${esc(p.fecha)}<br>
        <small>${esc(p.hora)}</small>
      </td>
      <td class="productos-celda">${productos||"—"}</td>
      <td><strong class="total">${money(p.total)}</strong></td>
      <td><span class="metodo">${esc(p.metodoPago)}</span></td>
      <td>${pagoHtml}</td>
      <td>
        ${p.ticket?`<strong class="ticket">${esc(p.ticket)}</strong>`:'<span class="sin-ticket">—</span>'}
      </td>
      <td><span class="estado-pedido ${clasePedido(p.estadoPedido)}">${esc(p.estadoPedido)}</span></td>
      <td>${accionHtml}</td>
    </tr>
  `;
}

async function cambiarEstadoPago(id,estado){
  if(estado==="PAGO RECHAZADO"){
    const confirmar=window.confirm("¿Confirmar que el pago del pedido "+id+" fue rechazado?");
    if(!confirmar) return;
  }

  try{
    const r=await fetch(ROXY_BACKEND,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({
        accion:"CAMBIAR_ESTADO_PAGO",
        idPedido:id,
        estadoPago:estado,
        usuario:"CAJERO"
      })
    });

    const j=await r.json();

    if(j.estado!=="OK"){
      alert(j.mensaje||"No se pudo actualizar el pago.");
      return;
    }

    if(estado==="PAGADO"){
      alert("Pago confirmado.\nTicket generado: "+j.ticket);
    }

    await cargar();
  }catch(e){
    alert("No se pudo conectar con el backend.");
  }
}

async function cambiarEstado(id,estado){
  try{
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
      alert(j.mensaje||"No se pudo actualizar el pedido.");
      return;
    }

    await cargar();
  }catch(e){
    alert("No se pudo conectar con el backend.");
  }
}

$("actualizar").onclick=cargar;
cargar();
setInterval(cargar,5000);
