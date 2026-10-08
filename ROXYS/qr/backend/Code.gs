const ID_HOJA="1v-pq4YQqTWmIT29AVk_1YG3qWzm2Xs4AixYGQc9kq54";
const ZONA="America/Lima";
const NOMBRE_HOJA="BD ROXY";
const NOMBRE_PRODUCTOS="PRODUCTOS";
const NOMBRE_CATEGORIAS="CATEGORIAS";
const NOMBRE_PEDIDOS="PEDIDOS";
const NOMBRE_DETALLE="DETALLE_PEDIDOS";
const NOMBRE_HISTORIAL="HISTORIAL_PEDIDOS";
const NOMBRE_PRECIOS="PRECIOS";
const NOMBRE_CONFIG="CONFIG_ROXY";

function doGet(e){
  try{
    const accion=String(e&&e.parameter&&e.parameter.accion||"").trim().toUpperCase();
    if(accion==="PRODUCTOS") return obtenerProductos();
    if(accion==="CATEGORIAS") return obtenerCategorias();
    if(accion==="PEDIDOS") return obtenerPedidos();
    if(accion==="PEDIDO") return obtenerPedido(String(e.parameter.idPedido||"").trim());
    if(accion==="CONFIG") return obtenerConfig();
    if(accion==="CREAR_PEDIDO"){
      const datos=JSON.parse(decodeURIComponent(String(e.parameter.pedido||"{}")));
      return crearPedido(datos);
    }
    return respuesta({estado:"OK",mensaje:"ROXY_BACKEND funcionando"});
  }catch(error){
    return respuesta({estado:"ERROR",mensaje:error.message});
  }
}

function doPost(e){
  try{
    const datos=JSON.parse(e.postData.contents||"{}");
    const accion=String(datos.accion||"").trim().toUpperCase();

    if(accion==="CREAR_PEDIDO") return crearPedido(datos);
    if(accion==="CONFIRMAR_PAGO") return confirmarPago(datos);
    if(accion==="CAMBIAR_ESTADO_PEDIDO") return cambiarEstadoPedido(datos);
    if(accion==="CANCELAR_PEDIDO") return cancelarPedido(datos);

    if(accion==="CREAR_CATEGORIA") return crearCategoria(datos);
    if(accion==="MODIFICAR_CATEGORIA") return modificarCategoria(datos);
    if(accion==="ELIMINAR_CATEGORIA") return eliminarCategoria(datos);
    if(accion==="CAMBIAR_ESTADO_CATEGORIA") return cambiarEstadoCategoria(datos);

    if(accion==="ACTUALIZAR_PRODUCTO"||accion==="CAMBIAR_ESTADO_PRODUCTO") return actualizarProducto(datos);
    if(accion==="CREAR_PRODUCTO") return crearProducto(datos);
    if(accion==="MODIFICAR_PRODUCTO") return modificarProducto(datos);
    if(accion==="ELIMINAR_PRODUCTO") return eliminarProducto(datos);

    const nombre=normalizarNombre(datos.nombre);
    const sessionId=String(datos.sessionId||"").trim();
    const operationId=String(datos.operationId||"").trim();

    if(!nombre) return respuesta({estado:"ERROR",mensaje:"El nombre es obligatorio."});

    const hoja=obtenerHoja();
    const estadoActual=obtenerEstadoActual(hoja,nombre);

    if(accion==="PRESENTE"){
      if(estadoActual.estado==="ATENDIENDO"){
        return respuesta({estado:"PENDIENTE",mensaje:"Tienes una entrega pendiente.",nombre:nombre,sessionId:estadoActual.sessionId,operationId:estadoActual.operationId,estadoActual:"ATENDIENDO"});
      }
      if(estadoActual.estado==="BREAK"||estadoActual.estado==="PAUSA"){
        registrar(hoja,estadoActual.sessionId,nombre,"PRESENTE","");
        return respuesta({estado:"OK",mensaje:"Regreso registrado.",nombre:nombre,sessionId:estadoActual.sessionId,operationId:"",estadoActual:"EN LINEA"});
      }
      if(estadoActual.estado==="EN LINEA"){
        return respuesta({estado:"YA_ACTIVO",mensaje:"El usuario ya está en línea.",nombre:nombre,sessionId:estadoActual.sessionId,operationId:"",estadoActual:"EN LINEA"});
      }
      const nuevaSesion=crearId("SES");
      registrar(hoja,nuevaSesion,nombre,"PRESENTE","");
      return respuesta({estado:"OK",mensaje:"Marcación registrada.",nombre:nombre,sessionId:nuevaSesion,operationId:"",estadoActual:"EN LINEA"});
    }

    if(!sessionId) return respuesta({estado:"ERROR",mensaje:"Falta el ID de sesión."});

    if(accion==="ATENDIENDO"){
      const nuevaOperacion=crearId("OP");
      registrar(hoja,sessionId,nombre,"ATENDIENDO",nuevaOperacion);
      return respuesta({estado:"OK",mensaje:"Atención registrada.",nombre:nombre,sessionId:sessionId,operationId:nuevaOperacion,estadoActual:"ATENDIENDO",cerrarDashboard:true});
    }

    if(accion==="ENTREGADO"){
      if(!operationId) return respuesta({estado:"ERROR",mensaje:"Falta el ID de operación."});
      registrar(hoja,sessionId,nombre,"ENTREGADO",operationId);
      return respuesta({estado:"OK",mensaje:"Entrega registrada.",nombre:nombre,sessionId:sessionId,operationId:operationId,estadoActual:"EN LINEA"});
    }

    if(accion==="BREAK"){
      registrar(hoja,sessionId,nombre,"BREAK","");
      return respuesta({estado:"OK",mensaje:"BREAK registrado.",nombre:nombre,sessionId:sessionId,operationId:"",estadoActual:"BREAK",cerrarDashboard:true});
    }

    if(accion==="PAUSA"){
      registrar(hoja,sessionId,nombre,"PAUSA","");
      return respuesta({estado:"OK",mensaje:"PAUSA registrada.",nombre:nombre,sessionId:sessionId,operationId:"",estadoActual:"PAUSA",cerrarDashboard:true});
    }

    if(accion==="TERMINO DE TURNO"){
      registrar(hoja,sessionId,nombre,"TÉRMINO DE TURNO","");
      return respuesta({estado:"OK",mensaje:"Término de turno registrado.",nombre:nombre,sessionId:sessionId,operationId:"",estadoActual:"FUERA DE TURNO",cerrarDashboard:true});
    }

    return respuesta({estado:"ERROR",mensaje:"Acción no reconocida."});
  }catch(error){
    return respuesta({estado:"ERROR",mensaje:error.message});
  }
}

function setupRoxy(){
  const libro=SpreadsheetApp.openById(ID_HOJA);
  asegurarHoja(libro,NOMBRE_CATEGORIAS,["ID_CATEGORIA","NOMBRE_CATEGORIA","ICONO","ACTIVO"]);
  asegurarHoja(libro,NOMBRE_PEDIDOS,["ID_PEDIDO","FECHA","HORA","NOMBRE_CLIENTE","ESTADO_PEDIDO","METODO_PAGO","ESTADO_PAGO","TOTAL","TICKET","FECHA_ACTUALIZACION"]);
  asegurarHoja(libro,NOMBRE_DETALLE,["ID_DETALLE","ID_PEDIDO","ID_PRODUCTO","NOMBRE_PRODUCTO","CANTIDAD","PRECIO_UNITARIO","SUBTOTAL"]);
  asegurarHoja(libro,NOMBRE_HISTORIAL,["ID_HISTORIAL","ID_PEDIDO","FECHA","HORA","ESTADO_ANTERIOR","ESTADO_NUEVO","USUARIO","OBSERVACION"]);
  asegurarHoja(libro,NOMBRE_PRECIOS,["ID_PRODUCTO","NOMBRE_PRODUCTO","PRECIO","ACTIVO"]);
  asegurarHoja(libro,NOMBRE_CONFIG,["CLAVE","VALOR"]);
  inicializarCategorias();
  inicializarPreciosPrueba();
  return "ROXY preparado";
}

function asegurarHoja(libro,nombre,encabezados){
  let hoja=libro.getSheetByName(nombre);
  if(!hoja) hoja=libro.insertSheet(nombre);
  if(hoja.getLastRow()===0) hoja.getRange(1,1,1,encabezados.length).setValues([encabezados]);
  return hoja;
}

function inicializarCategorias(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CATEGORIAS);
  if(hoja.getLastRow()>1) return;
  hoja.getRange(2,1,3,4).setValues([
    ["CAT-001","FRUTAS NATURALES","🍓","SI"],
    ["CAT-002","LECHE C/ FRUTAS","🥛","SI"],
    ["CAT-003","ESPECIALES ROXY","⭐","SI"]
  ]);
}

function inicializarPreciosPrueba(){
  const libro=SpreadsheetApp.openById(ID_HOJA);
  const hoja=libro.getSheetByName(NOMBRE_PRECIOS);
  const productos=libro.getSheetByName(NOMBRE_PRODUCTOS);
  if(!productos||productos.getLastRow()<2) return;
  const existentes=hoja.getLastRow()>1?hoja.getRange(2,1,hoja.getLastRow()-1,1).getValues().flat().map(String):[];
  const datos=productos.getRange(2,1,productos.getLastRow()-1,6).getValues();
  const nuevas=[];
  datos.forEach(f=>{
    const id=String(f[0]||"").trim();
    const nombre=String(f[1]||"").trim();
    if(id&&existentes.indexOf(id)===-1) nuevas.push([id,nombre,5,"SI"]);
  });
  if(nuevas.length) hoja.getRange(hoja.getLastRow()+1,1,nuevas.length,4).setValues(nuevas);
  const config=libro.getSheetByName(NOMBRE_CONFIG);
  if(config.getLastRow()===1) config.getRange(2,1,3,2).setValues([["MODO_PRUEBA","SI"],["PRECIO_PRUEBA","5"],["MONEDA","PEN"]]);
}

function obtenerProductos(){
  const libro=SpreadsheetApp.openById(ID_HOJA);
  const hoja=libro.getSheetByName(NOMBRE_PRODUCTOS);
  if(!hoja) throw new Error("No existe la hoja PRODUCTOS.");
  const ultimaFila=hoja.getLastRow();
  if(ultimaFila<2) return respuesta({estado:"OK",productos:[]});
  const datos=hoja.getRange(1,1,ultimaFila,6).getValues();
  const precios=mapaPrecios();
  const categorias=mapaCategorias();
  const productos=[];
  for(let i=1;i<datos.length;i++){
    const fila=datos[i];
    const id=String(fila[0]||"").trim();
    const nombre=String(fila[1]||"").trim();
    const idCategoria=String(fila[2]||"").trim();
    const icono=String(fila[3]||"").trim();
    const estado=String(fila[4]||"").trim().toUpperCase();
    const activo=String(fila[5]||"").trim().toUpperCase();
    if(!id||!nombre||activo!=="SI") continue;
    productos.push({idProducto:id,nombre:nombre,idCategoria:idCategoria,categoria:categorias[idCategoria]||idCategoria,icono:icono,estado:estado||"DISPONIBLE",activo:activo,precio:Number(precios[id]||precioPrueba())});
  }
  return respuesta({estado:"OK",productos:productos});
}

function obtenerCategorias(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CATEGORIAS);
  if(!hoja) throw new Error("No existe la hoja CATEGORIAS.");
  const datos=hoja.getLastRow()>1?hoja.getRange(2,1,hoja.getLastRow()-1,4).getValues():[];
  const categorias=datos.filter(f=>String(f[3]||"").toUpperCase()==="SI").map(f=>({idCategoria:String(f[0]||""),nombre:String(f[1]||""),icono:String(f[2]||"")})).filter(x=>x.idCategoria&&x.nombre);
  return respuesta({estado:"OK",categorias:categorias});
}

function obtenerPedidos(){
  const libro=SpreadsheetApp.openById(ID_HOJA);
  const hoja=libro.getSheetByName(NOMBRE_PEDIDOS);
  const detalle=libro.getSheetByName(NOMBRE_DETALLE);
  if(!hoja||!detalle) throw new Error("Faltan hojas de pedidos.");
  const pedidos=hoja.getLastRow()>1?hoja.getRange(2,1,hoja.getLastRow()-1,10).getValues():[];
  const detalles=detalle.getLastRow()>1?detalle.getRange(2,1,detalle.getLastRow()-1,7).getValues():[];
  const lista=pedidos.filter(f=>String(f[0]||"")).map(f=>{
    const id=String(f[0]);
    return {idPedido:id,fecha:String(f[1]||""),hora:String(f[2]||""),nombreCliente:String(f[3]||""),estadoPedido:String(f[4]||""),metodoPago:String(f[5]||""),estadoPago:String(f[6]||""),total:Number(f[7]||0),ticket:String(f[8]||""),fechaActualizacion:String(f[9]||""),items:detalles.filter(d=>String(d[1])===id).map(d=>({idDetalle:String(d[0]),idProducto:String(d[2]),nombreProducto:String(d[3]),cantidad:Number(d[4]||0),precioUnitario:Number(d[5]||0),subtotal:Number(d[6]||0)}))};
  });
  lista.reverse();
  return respuesta({estado:"OK",pedidos:lista});
}

function obtenerPedido(idPedido){
  const data=obtenerPedidos().getContent();
  const obj=JSON.parse(data);
  if(obj.estado!=="OK") return respuesta(obj);
  const pedido=obj.pedidos.find(p=>p.idPedido===idPedido);
  return respuesta(pedido?{estado:"OK",pedido:pedido}:{estado:"ERROR",mensaje:"Pedido no encontrado."});
}

function crearPedido(datos){
  const nombre=String(datos.nombreCliente||"").trim();
  const metodo=String(datos.metodoPago||"").trim().toUpperCase();
  const items=Array.isArray(datos.items)?datos.items:[];
  if(!nombre) throw new Error("El nombre del cliente es obligatorio.");
  if(["YAPE","PLIN","EFECTIVO"].indexOf(metodo)===-1) throw new Error("Método de pago no válido.");
  if(!items.length) throw new Error("El pedido no tiene productos.");
  const productos=obtenerProductosObjeto();
  const libro=SpreadsheetApp.openById(ID_HOJA);
  const pedidos=libro.getSheetByName(NOMBRE_PEDIDOS);
  const detalle=libro.getSheetByName(NOMBRE_DETALLE);
  const historial=libro.getSheetByName(NOMBRE_HISTORIAL);
  const idPedido=crearId("PED");
  const ahora=new Date();
  const fecha=Utilities.formatDate(ahora,ZONA,"dd/MM/yyyy");
  const hora=Utilities.formatDate(ahora,ZONA,"HH:mm:ss");
  let total=0;
  const filas=[];
  items.forEach(item=>{
    const id=String(item.idProducto||"").trim();
    const cantidad=Math.max(1,Number(item.cantidad||1));
    const p=productos[id];
    if(!p) throw new Error("Producto no válido: "+id);
    if(p.activo!=="SI"||p.estado!=="DISPONIBLE") throw new Error("El producto no está disponible: "+p.nombre);
    const subtotal=p.precio*cantidad;
    total+=subtotal;
    filas.push([crearId("DET"),idPedido,id,p.nombre,cantidad,p.precio,subtotal]);
  });
  pedidos.appendRow([idPedido,fecha,hora,nombre,"PENDIENTE",metodo,"PENDIENTE",total,"",fecha+" "+hora]);
  if(filas.length) detalle.getRange(detalle.getLastRow()+1,1,filas.length,7).setValues(filas);
  historial.appendRow([crearId("HIS"),idPedido,fecha,hora,"","PENDIENTE","CLIENTE","Pedido creado desde QR"]);
  return respuesta({estado:"OK",mensaje:"Pedido creado correctamente.",idPedido:idPedido,total:total,estadoPedido:"PENDIENTE",estadoPago:"PENDIENTE",metodoPago:metodo});
}

function confirmarPago(datos){
  const id=String(datos.idPedido||"").trim();
  if(!id) throw new Error("Falta ID_PEDIDO.");
  const libro=SpreadsheetApp.openById(ID_HOJA);
  const hoja=libro.getSheetByName(NOMBRE_PEDIDOS);
  const fila=encontrarFila(hoja,id,1);
  if(fila<2) throw new Error("No se encontró el pedido.");
  const ahora=new Date();
  const fecha=Utilities.formatDate(ahora,ZONA,"dd/MM/yyyy");
  const hora=Utilities.formatDate(ahora,ZONA,"HH:mm:ss");
  const anterior=String(hoja.getRange(fila,5).getValue()||"");
  const ticket=String(hoja.getRange(fila,9).getValue()||"")||crearTicket();
  hoja.getRange(fila,5).setValue("CONFIRMADO");
  hoja.getRange(fila,7).setValue("PAGADO");
  hoja.getRange(fila,9).setValue(ticket);
  hoja.getRange(fila,10).setValue(fecha+" "+hora);
  libro.getSheetByName(NOMBRE_HISTORIAL).appendRow([crearId("HIS"),id,fecha,hora,anterior,"CONFIRMADO",String(datos.usuario||"CAJERO"),"Pago confirmado"]);
  return respuesta({estado:"OK",mensaje:"Pago confirmado.",idPedido:id,ticket:ticket,estadoPedido:"CONFIRMADO",estadoPago:"PAGADO"});
}

function cambiarEstadoPedido(datos){
  const id=String(datos.idPedido||"").trim();
  const nuevo=String(datos.estadoPedido||"").trim().toUpperCase();
  const permitidos=["PENDIENTE","CONFIRMADO","EN PREPARACIÓN","LISTO","ENTREGADO","CANCELADO"];
  if(permitidos.indexOf(nuevo)===-1) throw new Error("Estado de pedido no válido.");
  const libro=SpreadsheetApp.openById(ID_HOJA);
  const hoja=libro.getSheetByName(NOMBRE_PEDIDOS);
  const fila=encontrarFila(hoja,id,1);
  if(fila<2) throw new Error("No se encontró el pedido.");
  const anterior=String(hoja.getRange(fila,5).getValue()||"");
  const ahora=new Date();
  const fecha=Utilities.formatDate(ahora,ZONA,"dd/MM/yyyy");
  const hora=Utilities.formatDate(ahora,ZONA,"HH:mm:ss");
  hoja.getRange(fila,5).setValue(nuevo);
  hoja.getRange(fila,10).setValue(fecha+" "+hora);
  libro.getSheetByName(NOMBRE_HISTORIAL).appendRow([crearId("HIS"),id,fecha,hora,anterior,nuevo,String(datos.usuario||"CAJERO"),"Cambio de estado"]);
  return respuesta({estado:"OK",mensaje:"Estado actualizado.",idPedido:id,estadoPedido:nuevo});
}

function cancelarPedido(datos){
  datos.estadoPedido="CANCELADO";
  return cambiarEstadoPedido(datos);
}

function mapaPrecios(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_PRECIOS);
  const mapa={};
  if(!hoja||hoja.getLastRow()<2) return mapa;
  hoja.getRange(2,1,hoja.getLastRow()-1,4).getValues().forEach(f=>{
    const id=String(f[0]||"").trim();
    if(id&&String(f[3]||"SI").toUpperCase()==="SI") mapa[id]=Number(f[2]||0);
  });
  return mapa;
}

function precioPrueba(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CONFIG);
  if(!hoja||hoja.getLastRow()<2) return 5;
  const datos=hoja.getRange(2,1,hoja.getLastRow()-1,2).getValues();
  for(let i=0;i<datos.length;i++) if(String(datos[i][0])==="PRECIO_PRUEBA") return Number(datos[i][1]||5);
  return 5;
}

function obtenerConfig(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CONFIG);
  const config={};
  if(hoja&&hoja.getLastRow()>1) hoja.getRange(2,1,hoja.getLastRow()-1,2).getValues().forEach(f=>{if(f[0]) config[String(f[0])]=String(f[1]||"");});
  return respuesta({estado:"OK",config:config});
}

function obtenerProductosObjeto(){
  const resultado=JSON.parse(obtenerProductos().getContent());
  const mapa={};
  (resultado.productos||[]).forEach(p=>mapa[p.idProducto]=p);
  return mapa;
}

function crearCategoria(datos){
  const nombre=String(datos.nombreCategoria||"").trim().toUpperCase();
  const icono=String(datos.icono||"⭐").trim();
  if(!nombre) throw new Error("El nombre de la categoría es obligatorio.");
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CATEGORIAS);
  const existentes=hoja.getLastRow()>1?hoja.getRange(2,1,hoja.getLastRow()-1,4).getValues():[];
  if(existentes.some(f=>String(f[1]).trim().toUpperCase()===nombre)) throw new Error("Ya existe la categoría.");
  const id=crearIdCategoria();
  hoja.appendRow([id,nombre,icono,"SI"]);
  return respuesta({estado:"OK",mensaje:"Categoría creada.",categoria:{idCategoria:id,nombre:nombre,icono:icono,activo:"SI"}});
}

function modificarCategoria(datos){
  const id=String(datos.idCategoria||"").trim();
  const nombre=String(datos.nombreCategoria||"").trim().toUpperCase();
  const icono=String(datos.icono||"⭐").trim();
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CATEGORIAS);
  const fila=encontrarFila(hoja,id,1);
  if(fila<2) throw new Error("No se encontró la categoría.");
  hoja.getRange(fila,1,1,4).setValues([[id,nombre,icono,String(datos.activo||"SI").toUpperCase()]]);
  return respuesta({estado:"OK",mensaje:"Categoría modificada."});
}

function eliminarCategoria(datos){
  return cambiarEstadoCategoria({idCategoria:datos.idCategoria,activo:"NO"});
}

function cambiarEstadoCategoria(datos){
  const id=String(datos.idCategoria||"").trim();
  const activo=String(datos.activo||"NO").toUpperCase();
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CATEGORIAS);
  const fila=encontrarFila(hoja,id,1);
  if(fila<2) throw new Error("No se encontró la categoría.");
  hoja.getRange(fila,4).setValue(activo==="SI"?"SI":"NO");
  return respuesta({estado:"OK",mensaje:"Estado de categoría actualizado."});
}

function actualizarProducto(datos){
  const idProducto=String(datos.idProducto||"").trim();
  const estado=String(datos.estado||"").trim().toUpperCase();
  const permitidos=["DISPONIBLE","EN PREPARACIÓN","AGOTADO"];
  if(!idProducto) throw new Error("Falta ID_PRODUCTO.");
  if(permitidos.indexOf(estado)===-1) throw new Error("Estado de producto no válido.");
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_PRODUCTOS);
  const fila=encontrarFila(hoja,idProducto,1);
  if(fila<2) throw new Error("No se encontró el producto.");
  hoja.getRange(fila,5).setValue(estado);
  return respuesta({estado:"OK",mensaje:"Estado del producto actualizado.",idProducto:idProducto,estadoActual:estado});
}

function validarDatosProducto(datos,permitirIdAutomatico){
  const idProducto=String(datos.idProducto||"").trim();
  const nombre=String(datos.nombreProducto||datos.nombre||"").trim();
  const idCategoria=String(datos.idCategoria||"").trim();
  const icono=String(datos.icono||"🍧").trim();
  const estado=String(datos.estado||"DISPONIBLE").trim().toUpperCase();
  const activo=String(datos.activo||"SI").trim().toUpperCase();
  if(!nombre) throw new Error("El nombre del producto es obligatorio.");
  if(!idCategoria) throw new Error("El ID de categoría es obligatorio.");
  if(!icono) throw new Error("El icono es obligatorio.");
  if(["DISPONIBLE","EN PREPARACIÓN","AGOTADO"].indexOf(estado)===-1) throw new Error("Estado de producto no válido.");
  if(["SI","NO"].indexOf(activo)===-1) throw new Error("ACTIVO debe ser SI o NO.");
  if(!permitirIdAutomatico&&!idProducto) throw new Error("Falta ID_PRODUCTO.");
  return {idProducto:idProducto,nombre:nombre,idCategoria:idCategoria,icono:icono,estado:estado,activo:activo};
}

function crearProducto(datos){
  const p=validarDatosProducto(datos,true);
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_PRODUCTOS);
  if(!hoja) throw new Error("No existe la hoja PRODUCTOS.");
  p.idProducto=p.idProducto||crearId("PROD");
  const datosExistentes=hoja.getLastRow()>1?hoja.getRange(2,1,hoja.getLastRow()-1,6).getValues():[];
  if(datosExistentes.some(f=>String(f[0])===p.idProducto)) throw new Error("El ID_PRODUCTO ya existe.");
  if(datosExistentes.some(f=>String(f[1]).trim().toUpperCase()===p.nombre.toUpperCase())) throw new Error("Ya existe un producto con ese nombre.");
  hoja.appendRow([p.idProducto,p.nombre,p.idCategoria,p.icono,p.estado,p.activo]);
  SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_PRECIOS).appendRow([p.idProducto,p.nombre,precioPrueba(),"SI"]);
  registrarOperacionProducto(datos,"CREAR PRODUCTO: "+p.nombre);
  return respuesta({estado:"OK",mensaje:"Producto creado correctamente.",producto:p});
}

function modificarProducto(datos){
  const p=validarDatosProducto(datos,false);
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_PRODUCTOS);
  const fila=encontrarFila(hoja,p.idProducto,1);
  if(fila<2) throw new Error("No se encontró el producto.");
  const datosExistentes=hoja.getRange(2,1,hoja.getLastRow()-1,6).getValues();
  if(datosExistentes.some(f=>String(f[0])!==p.idProducto&&String(f[1]).trim().toUpperCase()===p.nombre.toUpperCase())) throw new Error("Ya existe otro producto con ese nombre.");
  hoja.getRange(fila,1,1,6).setValues([[p.idProducto,p.nombre,p.idCategoria,p.icono,p.estado,p.activo]]);
  actualizarPrecioNombre(p.idProducto,p.nombre);
  registrarOperacionProducto(datos,"MODIFICAR PRODUCTO: "+p.nombre);
  return respuesta({estado:"OK",mensaje:"Producto modificado correctamente.",producto:p});
}

function eliminarProducto(datos){
  const id=String(datos.idProducto||"").trim();
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_PRODUCTOS);
  const fila=encontrarFila(hoja,id,1);
  if(fila<2) throw new Error("No se encontró el producto.");
  hoja.getRange(fila,6).setValue("NO");
  registrarOperacionProducto(datos,"ELIMINAR PRODUCTO");
  return respuesta({estado:"OK",mensaje:"Producto eliminado correctamente.",idProducto:id});
}

function actualizarPrecioNombre(id,nombre){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_PRECIOS);
  if(!hoja||hoja.getLastRow()<2) return;
  const fila=encontrarFila(hoja,id,1);
  if(fila>=2) hoja.getRange(fila,2).setValue(nombre);
}

function registrarOperacionProducto(datos,accion){
  try{
    const nombre=normalizarNombre(datos.nombre);
    if(!nombre) return;
    registrar(obtenerHoja(),String(datos.sessionId||""),nombre,accion,String(datos.operationId||""));
  }catch(error){}
}

function obtenerHoja(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_HOJA);
  if(!hoja) throw new Error("No existe la hoja BD ROXY.");
  if(hoja.getRange("A1:G1").getValues()[0].join("").trim()===""){
    hoja.getRange("A1:G1").setValues([["ID","NOMBRE COMPLETO","FECHA","HORA","ACCIÓN","ID SESIÓN","ID OPERACIÓN"]]);
  }else{
    hoja.getRange("F1").setValue("ID SESIÓN");
    hoja.getRange("G1").setValue("ID OPERACIÓN");
  }
  return hoja;
}

function registrar(hoja,sessionId,nombre,accion,operationId){
  const ahora=new Date();
  const fecha=Utilities.formatDate(ahora,ZONA,"dd/MM/yyyy");
  const hora=Utilities.formatDate(ahora,ZONA,"HH:mm:ss");
  hoja.appendRow([crearId("M"),nombre,fecha,hora,accion,sessionId,operationId]);
}

function obtenerEstadoActual(hoja,nombre){
  const ultimaFila=hoja.getLastRow();
  if(ultimaFila<2) return {estado:"FUERA DE TURNO",sessionId:"",operationId:""};
  const datos=hoja.getRange(2,1,ultimaFila-1,7).getValues();
  let ultima=null;
  for(let i=datos.length-1;i>=0;i--){
    if(String(datos[i][1]||"").trim().toUpperCase()===nombre.toUpperCase()){ultima=datos[i];break;}
  }
  if(!ultima) return {estado:"FUERA DE TURNO",sessionId:"",operationId:""};
  const accion=String(ultima[4]||"").trim().toUpperCase();
  const sessionId=String(ultima[5]||"").trim();
  const operationId=String(ultima[6]||"").trim();
  if(accion==="ATENDIENDO") return {estado:"ATENDIENDO",sessionId:sessionId,operationId:operationId};
  if(accion==="BREAK") return {estado:"BREAK",sessionId:sessionId,operationId:""};
  if(accion==="PAUSA") return {estado:"PAUSA",sessionId:sessionId,operationId:""};
  if(accion==="TÉRMINO DE TURNO") return {estado:"FUERA DE TURNO",sessionId:"",operationId:""};
  return {estado:"EN LINEA",sessionId:sessionId,operationId:""};
}

function mapaCategorias(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CATEGORIAS);
  const mapa={};
  if(!hoja||hoja.getLastRow()<2) return mapa;
  hoja.getRange(2,1,hoja.getLastRow()-1,4).getValues().forEach(f=>{if(String(f[3]).toUpperCase()==="SI") mapa[String(f[0])]=String(f[1]);});
  return mapa;
}

function encontrarFila(hoja,valor,columna){
  if(!hoja||hoja.getLastRow()<2) return -1;
  const datos=hoja.getRange(2,columna,hoja.getLastRow()-1,1).getValues();
  for(let i=0;i<datos.length;i++) if(String(datos[i][0]||"").trim()===valor) return i+2;
  return -1;
}

function crearId(prefijo){
  const sello=Utilities.formatDate(new Date(),ZONA,"yyyyMMddHHmmssSSS");
  return prefijo+"-"+sello+"-"+Math.floor(Math.random()*1000);
}

function crearIdCategoria(){
  const hoja=SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_CATEGORIAS);
  const n=Math.max(0,hoja.getLastRow()-1)+1;
  return "CAT-"+String(n).padStart(3,"0");
}

function crearTicket(){
  return "R-"+Math.floor(1000+Math.random()*9000);
}

function normalizarNombre(nombre){
  return String(nombre||"").trim().replace(/\s+/g," ").toUpperCase();
}

function respuesta(datos){
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}
