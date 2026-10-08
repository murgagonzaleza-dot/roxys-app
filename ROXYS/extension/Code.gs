const ID_HOJA="1v-pq4YQqTWmIT29AVk_1YG3qWzm2Xs4AixYGQc9kq54";
const NOMBRE_HOJA="BD ROXY";
const NOMBRE_PRODUCTOS="PRODUCTOS";
const ZONA="America/Lima";

function doGet(e){
    const accion=String((e&&e.parameter&&e.parameter.accion)||"").trim().toUpperCase();

    if(accion==="PRODUCTOS"){
        return respuesta({
            estado:"OK",
            productos:obtenerProductos()
        });
    }

    return respuesta({
        estado:"OK",
        mensaje:"ROXY_BACKEND funcionando"
    });
}

function doPost(e){
    try{
        const datos=JSON.parse(e.postData.contents||"{}");
        const nombre=normalizarNombre(datos.nombre);
        const accion=String(datos.accion||"PRESENTE").trim().toUpperCase();
        const sessionId=String(datos.sessionId||"").trim();
        const operationId=String(datos.operationId||"").trim();

        if(accion==="CAMBIAR_ESTADO_PRODUCTO"){
            return cambiarEstadoProducto(datos);
        }

        if(!nombre){
            return respuesta({
                estado:"ERROR",
                mensaje:"El nombre es obligatorio."
            });
        }

        const hoja=obtenerHoja();
        const estadoActual=obtenerEstadoActual(hoja,nombre);

        if(accion==="PRESENTE"){
            if(estadoActual.estado==="ATENDIENDO"){
                return respuesta({
                    estado:"PENDIENTE",
                    mensaje:"Tienes una entrega pendiente.",
                    nombre:nombre,
                    sessionId:estadoActual.sessionId,
                    operationId:estadoActual.operationId,
                    estadoActual:"ATENDIENDO"
                });
            }

            if(estadoActual.estado==="BREAK"||estadoActual.estado==="PAUSA"){
                registrar(hoja,estadoActual.sessionId,nombre,"PRESENTE","");
                return respuesta({
                    estado:"OK",
                    mensaje:"Regreso registrado.",
                    nombre:nombre,
                    sessionId:estadoActual.sessionId,
                    operationId:"",
                    estadoActual:"EN LINEA"
                });
            }

            if(estadoActual.estado==="EN LINEA"){
                return respuesta({
                    estado:"YA_ACTIVO",
                    mensaje:"El usuario ya está en línea.",
                    nombre:nombre,
                    sessionId:estadoActual.sessionId,
                    operationId:"",
                    estadoActual:"EN LINEA"
                });
            }

            const nuevaSesion=crearId("SES");
            registrar(hoja,nuevaSesion,nombre,"PRESENTE","");

            return respuesta({
                estado:"OK",
                mensaje:"Marcación registrada.",
                nombre:nombre,
                sessionId:nuevaSesion,
                operationId:"",
                estadoActual:"EN LINEA"
            });
        }

        if(!sessionId){
            return respuesta({
                estado:"ERROR",
                mensaje:"Falta el ID de sesión."
            });
        }

        if(accion==="ATENDIENDO"){
            const nuevaOperacion=crearId("OP");
            registrar(hoja,sessionId,nombre,"ATENDIENDO",nuevaOperacion);

            return respuesta({
                estado:"OK",
                mensaje:"Atención registrada.",
                nombre:nombre,
                sessionId:sessionId,
                operationId:nuevaOperacion,
                estadoActual:"ATENDIENDO",
                cerrarDashboard:true
            });
        }

        if(accion==="ENTREGADO"){
            if(!operationId){
                return respuesta({
                    estado:"ERROR",
                    mensaje:"Falta el ID de operación."
                });
            }

            registrar(hoja,sessionId,nombre,"ENTREGADO",operationId);

            return respuesta({
                estado:"OK",
                mensaje:"Entrega registrada.",
                nombre:nombre,
                sessionId:sessionId,
                operationId:operationId,
                estadoActual:"EN LINEA"
            });
        }

        if(accion==="BREAK"){
            registrar(hoja,sessionId,nombre,"BREAK","");

            return respuesta({
                estado:"OK",
                mensaje:"BREAK registrado.",
                nombre:nombre,
                sessionId:sessionId,
                operationId:"",
                estadoActual:"BREAK",
                cerrarDashboard:true
            });
        }

        if(accion==="PAUSA"){
            registrar(hoja,sessionId,nombre,"PAUSA","");

            return respuesta({
                estado:"OK",
                mensaje:"PAUSA registrada.",
                nombre:nombre,
                sessionId:sessionId,
                operationId:"",
                estadoActual:"PAUSA",
                cerrarDashboard:true
            });
        }

        if(accion==="TERMINO DE TURNO"){
            registrar(hoja,sessionId,nombre,"TÉRMINO DE TURNO","");

            return respuesta({
                estado:"OK",
                mensaje:"Término de turno registrado.",
                nombre:nombre,
                sessionId:sessionId,
                operationId:"",
                estadoActual:"FUERA DE TURNO",
                cerrarDashboard:true
            });
        }

        return respuesta({
            estado:"ERROR",
            mensaje:"Acción no reconocida."
        });

    }catch(error){
        return respuesta({
            estado:"ERROR",
            mensaje:error.message
        });
    }
}

function obtenerProductos(){
    const libro=SpreadsheetApp.openById(ID_HOJA);
    const hoja=libro.getSheetByName(NOMBRE_PRODUCTOS);

    if(!hoja){
        throw new Error("No existe la hoja PRODUCTOS.");
    }

    const ultimaFila=hoja.getLastRow();

    if(ultimaFila<2){
        return [];
    }

    const datos=hoja.getRange(2,1,ultimaFila-1,6).getValues();

    return datos
        .filter(fila=>String(fila[0]||"").trim()!=="")
        .filter(fila=>String(fila[5]||"SI").trim().toUpperCase()==="SI")
        .map(fila=>({
            idProducto:String(fila[0]||"").trim(),
            nombre:String(fila[1]||"").trim(),
            idCategoria:String(fila[2]||"").trim(),
            categoria:nombreCategoria(String(fila[2]||"").trim()),
            icono:String(fila[3]||"🍧").trim(),
            estado:String(fila[4]||"DISPONIBLE").trim().toUpperCase()
        }));
}

function nombreCategoria(id){
    const categorias={
        "CAT-001":"Frutas",
        "CAT-002":"Leche c/ Frutas",
        "CAT-003":"Especiales"
    };

    return categorias[id]||id;
}

function cambiarEstadoProducto(datos){
    const idProducto=String(datos.idProducto||"").trim();
    const estado=String(datos.estado||"").trim().toUpperCase();

    const estadosPermitidos=[
        "DISPONIBLE",
        "EN PREPARACIÓN",
        "AGOTADO"
    ];

    if(!idProducto){
        return respuesta({
            estado:"ERROR",
            mensaje:"Falta el ID del producto."
        });
    }

    if(estadosPermitidos.indexOf(estado)===-1){
        return respuesta({
            estado:"ERROR",
            mensaje:"Estado de producto no válido."
        });
    }

    const libro=SpreadsheetApp.openById(ID_HOJA);
    const hoja=libro.getSheetByName(NOMBRE_PRODUCTOS);

    if(!hoja){
        return respuesta({
            estado:"ERROR",
            mensaje:"No existe la hoja PRODUCTOS."
        });
    }

    const ultimaFila=hoja.getLastRow();

    if(ultimaFila<2){
        return respuesta({
            estado:"ERROR",
            mensaje:"No hay productos registrados."
        });
    }

    const ids=hoja.getRange(2,1,ultimaFila-1,1).getValues();

    for(let i=0;i<ids.length;i++){
        if(String(ids[i][0]||"").trim()===idProducto){
            hoja.getRange(i+2,5).setValue(estado);

            return respuesta({
                estado:"OK",
                mensaje:"Estado actualizado.",
                idProducto:idProducto,
                estadoActual:estado
            });
        }
    }

    return respuesta({
        estado:"ERROR",
        mensaje:"No se encontró el producto."
    });
}

function obtenerHoja(){
    const libro=SpreadsheetApp.openById(ID_HOJA);
    const hoja=libro.getSheetByName(NOMBRE_HOJA);

    if(!hoja){
        throw new Error("No existe la hoja BD ROXY.");
    }

    const encabezados=hoja.getRange("A1:G1").getValues()[0];

    if(encabezados.join("").trim()===""){
        hoja.getRange("A1:G1").setValues([[
            "ID",
            "NOMBRE COMPLETO",
            "FECHA",
            "HORA",
            "ACCIÓN",
            "ID SESIÓN",
            "ID OPERACIÓN"
        ]]);
    }else{
        if(encabezados[5]!=="ID SESIÓN"){
            hoja.getRange("F1").setValue("ID SESIÓN");
        }

        if(encabezados[6]!=="ID OPERACIÓN"){
            hoja.getRange("G1").setValue("ID OPERACIÓN");
        }
    }

    return hoja;
}

function registrar(hoja,sessionId,nombre,accion,operationId){
    const ahora=new Date();

    const fecha=Utilities.formatDate(
        ahora,
        ZONA,
        "dd/MM/yyyy"
    );

    const hora=Utilities.formatDate(
        ahora,
        ZONA,
        "HH:mm:ss"
    );

    const id=crearId("M");

    hoja.appendRow([
        id,
        nombre,
        fecha,
        hora,
        accion,
        sessionId,
        operationId
    ]);
}

function obtenerEstadoActual(hoja,nombre){
    const ultimaFila=hoja.getLastRow();

    if(ultimaFila<2){
        return{
            estado:"FUERA DE TURNO",
            sessionId:"",
            operationId:""
        };
    }

    const datos=hoja.getRange(
        2,
        1,
        ultimaFila-1,
        7
    ).getValues();

    let ultima=null;

    for(let i=datos.length-1;i>=0;i--){
        const fila=datos[i];
        const nombreFila=String(
            fila[1]||""
        ).trim().toUpperCase();

        if(nombreFila===nombre.toUpperCase()){
            ultima=fila;
            break;
        }
    }

    if(!ultima){
        return{
            estado:"FUERA DE TURNO",
            sessionId:"",
            operationId:""
        };
    }

    const accion=String(
        ultima[4]||""
    ).trim().toUpperCase();

    const sessionId=String(
        ultima[5]||""
    ).trim();

    const operationId=String(
        ultima[6]||""
    ).trim();

    if(accion==="ATENDIENDO"){
        return{
            estado:"ATENDIENDO",
            sessionId:sessionId,
            operationId:operationId
        };
    }

    if(accion==="BREAK"){
        return{
            estado:"BREAK",
            sessionId:sessionId,
            operationId:""
        };
    }

    if(accion==="PAUSA"){
        return{
            estado:"PAUSA",
            sessionId:sessionId,
            operationId:""
        };
    }

    if(accion==="TÉRMINO DE TURNO"){
        return{
            estado:"FUERA DE TURNO",
            sessionId:"",
            operationId:""
        };
    }

    if(accion==="PRESENTE"||accion==="ENTREGADO"){
        return{
            estado:"EN LINEA",
            sessionId:sessionId,
            operationId:""
        };
    }

    return{
        estado:"FUERA DE TURNO",
        sessionId:"",
        operationId:""
    };
}

function crearId(prefijo){
    const ahora=new Date();

    const sello=Utilities.formatDate(
        ahora,
        ZONA,
        "yyyyMMddHHmmssSSS"
    );

    return prefijo+
        "-"+
        sello+
        "-"+
        Math.floor(Math.random()*1000);
}

function normalizarNombre(nombre){
    return String(nombre||"")
        .trim()
        .replace(/\s+/g," ")
        .toUpperCase();
}

function respuesta(datos){
    return ContentService
        .createTextOutput(
            JSON.stringify(datos)
        )
        .setMimeType(
            ContentService.MimeType.JSON
        );
}
