const URL_BACKEND="https://script.google.com/macros/s/AKfycbwe05nXJvFHFccc80P0RhugUPZcyMBbIdd4JVAUvdeNVLgyTRR3OlvWeVk-Q0yExI-nOA/exec";

const parametros=new URLSearchParams(window.location.search);
const cajero=parametros.get("cajero")||"Cajero";
const sessionId=parametros.get("sessionId")||"";
const operationId=parametros.get("operationId")||"";
const modo=parametros.get("modo")||"NORMAL";

const $=id=>document.getElementById(id);

const nombreUsuario=$("nombreUsuario");
const textoEstado=$("textoEstado");
const estadoPunto=$("estadoPunto");
const entregaPendiente=$("entregaPendiente");
const mensajeDashboard=$("mensajeDashboard");

const btnTV=$("btnTV");
const turnoSidebar=$("turnoSidebar");

const btnAtendiendo=$("btnAtendiendo");
const btnBreak=$("btnBreak");
const btnPausa=$("btnPausa");
const btnTermino=$("btnTermino");
const btnEntregado=$("btnEntregado");

const btnActualizarProductos=$("btnActualizarProductos");
const listaProductos=$("listaProductos");

const navProductos=$("navProductos");
const navTematica=$("navTematica");
const submenuProductos=$("submenuProductos");
const grupoProductos=$("grupoProductos");

const subRegistroProducto=$("subRegistroProducto");
const subCatalogo=$("subCatalogo");
const subTablaProductos=$("subTablaProductos");
const subPedido=$("subPedido");

const seccionProductos=$("seccionProductos");
const seccionRegistroProducto=$("seccionRegistroProducto");
const seccionCatalogo=$("seccionCatalogo");
const seccionTablaProductos=$("seccionTablaProductos");
const seccionPedido=$("seccionPedido");
const seccionTematica=$("seccionTematica");

const temaActualBadge=$("temaActualBadge");

const formRegistroProducto=$("formRegistroProducto");
const btnGuardarProducto=$("btnGuardarProducto");
const mensajeRegistroProducto=$("mensajeRegistroProducto");

const listaProductosCatalogo=$("listaProductosCatalogo");
const catalogoGrid=$("catalogoGrid");
const catalogoContador=$("catalogoContador");
const btnActualizarCatalogo=$("btnActualizarCatalogo");
const btnActualizarProductosCatalogo=$("btnActualizarProductosCatalogo");

const registroNombreInput=$("registroNombre");
const registroIconoInput=$("registroIcono");

let productosSistema=[];
let categoriaCatalogoActual="TODAS";

const temasPorMes={
    2:"amor",
    5:"madre",
    6:"padre",
    10:"halloween",
    12:"navidad"
};

const nombresTemas={
    auto:"Automática",
    halloween:"Halloween",
    navidad:"Navidad",
    amor:"Día del Amor",
    madre:"Día de la Madre",
    padre:"Día del Padre"
};

if(nombreUsuario){
    nombreUsuario.textContent=cajero;
}

function mensaje(texto){
    if(mensajeDashboard){
        mensajeDashboard.textContent=texto||"";
    }
}

function botonesTurno(){
    return [btnAtendiendo,btnBreak,btnPausa,btnTermino].filter(Boolean);
}

function bloquearTurno(valor){
    botonesTurno().forEach(boton=>{
        boton.disabled=valor;
    });
}

function configurarTV(){
    if(!btnTV)return;

    btnTV.addEventListener("click",evento=>{
        evento.preventDefault();

        const rutaTV="file:///C:/Users/M/Documents/extensiones/ROXYS/pantalla-tv/MONITOREO_ROXY_75TV_FINAL.html";

        if(typeof chrome!=="undefined"&&chrome.tabs&&chrome.tabs.create){
            chrome.tabs.create({url:rutaTV});
            return;
        }

        if(turnoSidebar){
            turnoSidebar.hidden=!turnoSidebar.hidden;
        }
    });
}

async function enviar(accion,operacion="",extra={}){
    const respuesta=await fetch(URL_BACKEND,{
        method:"POST",
        headers:{
            "Content-Type":"text/plain;charset=utf-8"
        },
        body:JSON.stringify({
            nombre:cajero,
            accion,
            sessionId,
            operationId:operacion,
            ...extra
        })
    });

    if(!respuesta.ok){
        throw new Error("El servidor respondió con error HTTP "+respuesta.status);
    }

    return await respuesta.json();
}

async function ejecutar(accion){
    bloquearTurno(true);
    mensaje("Registrando...");

    try{
        const resultado=await enviar(accion);

        if(resultado.estado!=="OK"){
            throw new Error(resultado.mensaje||"No se pudo registrar la acción.");
        }

        if(textoEstado){
            textoEstado.textContent=resultado.estadoActual||"EN LÍNEA";
        }

        if(estadoPunto){
            estadoPunto.style.background="#22c55e";
        }

        mensaje(resultado.mensaje||"Acción registrada.");

        if(resultado.cerrarDashboard){
            setTimeout(()=>window.close(),250);
            return;
        }

        bloquearTurno(false);

    }catch(error){
        console.error(error);
        mensaje(error.message||"No se pudo registrar la acción.");
        bloquearTurno(false);
    }
}

async function registrarAtendiendo(){
    bloquearTurno(true);
    mensaje("Registrando...");

    try{
        const resultado=await enviar("ATENDIENDO");

        if(resultado.estado!=="OK"){
            throw new Error(resultado.mensaje||"No se pudo registrar.");
        }

        if(textoEstado){
            textoEstado.textContent="ATENDIENDO";
        }

        if(estadoPunto){
            estadoPunto.style.background="#2563eb";
        }

        mensaje(resultado.mensaje||"Atendiendo.");
        bloquearTurno(false);

    }catch(error){
        console.error(error);
        mensaje(error.message||"No se pudo registrar.");
        bloquearTurno(false);
    }
}

async function registrarEntregado(){
    if(!btnEntregado)return;

    btnEntregado.disabled=true;
    mensaje("Registrando entrega...");

    try{
        const resultado=await enviar("ENTREGADO",operationId);

        if(resultado.estado!=="OK"){
            throw new Error(resultado.mensaje||"No se pudo registrar la entrega.");
        }

        if(entregaPendiente){
            entregaPendiente.hidden=true;
        }

        if(textoEstado){
            textoEstado.textContent="EN LÍNEA";
        }

        if(estadoPunto){
            estadoPunto.style.background="#22c55e";
        }

        mensaje(resultado.mensaje||"Entrega registrada.");
        bloquearTurno(false);

    }catch(error){
        console.error(error);
        mensaje(error.message||"No se pudo registrar la entrega.");
        btnEntregado.disabled=false;
    }
}

function normalizar(texto){
    return String(texto||"")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"");
}

function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,m=>({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#039;"
    }[m]));
}

function categoriaNombre(id){
    const nombres={
        "CAT-001":"🍓 Frutas Naturales",
        "CAT-002":"🥛 Leche c/ Frutas",
        "CAT-003":"⭐ Especiales Roxy"
    };

    return nombres[id]||id||"";
}

function claseEstado(estado){
    const e=normalizar(estado);

    if(e==="DISPONIBLE"){
        return "status-disponible";
    }

    if(e.includes("PREPAR")){
        return "status-preparacion";
    }

    return "status-agotado";
}

function productoDisponible(producto){
    return normalizar(producto.estado)==="DISPONIBLE" &&
        normalizar(producto.activo||"SI")!=="NO";
}

function crearFilaProducto(producto){
    const fila=document.createElement("tr");

    const celdaProducto=document.createElement("td");
    celdaProducto.className="product-cell";

    const icono=document.createElement("span");
    icono.className="p-icon";
    icono.textContent=producto.icono||"🍧";

    const nombre=document.createElement("span");
    nombre.className="p-name";
    nombre.textContent=producto.nombre||"";

    celdaProducto.append(icono,nombre);

    const celdaCategoria=document.createElement("td");
    celdaCategoria.textContent=
        producto.categoria||
        categoriaNombre(producto.idCategoria)||
        producto.idCategoria||
        "";

    const celdaEstado=document.createElement("td");

    const selector=document.createElement("select");
    selector.className="product-status-select";
    selector.dataset.productId=producto.idProducto||"";

    selector.innerHTML=`
        <option value="DISPONIBLE">🟢 Disponible</option>
        <option value="EN PREPARACIÓN">🟡 En Preparación</option>
        <option value="AGOTADO">🔴 Agotado</option>
    `;

    const estadoOriginal=producto.estado||"DISPONIBLE";

    selector.value=estadoOriginal;

    if(selector.value!==estadoOriginal){
        const estadoNormalizado=normalizar(estadoOriginal);

        if(estadoNormalizado==="DISPONIBLE"){
            selector.value="DISPONIBLE";
        }else if(estadoNormalizado==="EN PREPARACION"){
            selector.value="EN PREPARACIÓN";
        }else if(estadoNormalizado==="AGOTADO"){
            selector.value="AGOTADO";
        }
    }

    selector.addEventListener("change",async()=>{
        const nuevoEstado=selector.value;

        selector.disabled=true;
        mensaje("Actualizando "+(producto.nombre||"producto")+"...");

        try{
            const resultado=await enviar(
                "CAMBIAR_ESTADO_PRODUCTO",
                "",
                {
                    idProducto:producto.idProducto,
                    estado:nuevoEstado
                }
            );

            if(resultado.estado!=="OK"){
                throw new Error(
                    resultado.mensaje||
                    "No se pudo actualizar el producto."
                );
            }

            producto.estado=nuevoEstado;

            mensaje(
                (producto.nombre||"Producto")+
                " actualizado a "+
                nuevoEstado+
                "."
            );

            actualizarVistasProductos();

        }catch(error){
            console.error(error);

            selector.value=estadoOriginal;

            mensaje(
                error.message||
                "No se pudo actualizar el producto."
            );

        }finally{
            selector.disabled=false;
        }
    });

    celdaEstado.appendChild(selector);

    fila.append(
        celdaProducto,
        celdaCategoria,
        celdaEstado
    );

    return fila;
}

function mostrarProductos(productos){
    if(!listaProductos)return;

    listaProductos.innerHTML="";

    if(!Array.isArray(productos)||productos.length===0){
        const fila=document.createElement("tr");
        const celda=document.createElement("td");

        celda.colSpan=3;
        celda.textContent="No hay productos registrados.";

        fila.appendChild(celda);
        listaProductos.appendChild(fila);

        return;
    }

    productos.forEach(producto=>{
        listaProductos.appendChild(
            crearFilaProducto(producto)
        );
    });
}

function renderTablaProductosSistema(lista){
    if(!listaProductosCatalogo)return;

    listaProductosCatalogo.innerHTML="";

    if(!Array.isArray(lista)||!lista.length){
        listaProductosCatalogo.innerHTML=
            '<tr><td colspan="5">No hay productos registrados.</td></tr>';

        return;
    }

    lista.forEach(producto=>{
        const fila=document.createElement("tr");

        fila.innerHTML=`
            <td>${escapeHtml(producto.idProducto||"")}</td>
            <td>
                <div class="product-cell">
                    <span class="p-icon">
                        ${escapeHtml(producto.icono||"🍧")}
                    </span>
                    <span class="p-name">
                        ${escapeHtml(producto.nombre||"")}
                    </span>
                </div>
            </td>
            <td>
                ${escapeHtml(
                    producto.categoria||
                    categoriaNombre(producto.idCategoria)||
                    producto.idCategoria||
                    ""
                )}
            </td>
            <td>
                <span class="status-badge ${claseEstado(producto.estado)}">
                    ${escapeHtml(producto.estado||"")}
                </span>
            </td>
            <td>
                ${escapeHtml(producto.activo||"")}
            </td>
        `;

        listaProductosCatalogo.appendChild(fila);
    });
}

function renderCatalogo(){
    if(!catalogoGrid)return;

    const disponibles=productosSistema.filter(
        productoDisponible
    );

    const filtrados=
        categoriaCatalogoActual==="TODAS"
        ?disponibles
        :disponibles.filter(
            producto=>
                producto.idCategoria===categoriaCatalogoActual
        );

    if(catalogoContador){
        catalogoContador.textContent=
            `${filtrados.length} disponibles`;
    }

    catalogoGrid.innerHTML="";

    if(!filtrados.length){
        catalogoGrid.innerHTML=`
            <div class="catalog-empty">
                <span>🍧</span>
                <strong>No hay productos disponibles</strong>
                <small>
                    Los productos aparecerán aquí cuando estén DISPONIBLES.
                </small>
            </div>
        `;

        return;
    }

    filtrados.forEach(producto=>{
        const card=document.createElement("article");

        card.className="catalog-card";

        card.innerHTML=`
            <div class="catalog-card-icon">
                ${escapeHtml(producto.icono||"🍧")}
            </div>

            <div class="catalog-card-body">
                <span class="catalog-card-category">
                    ${escapeHtml(
                        categoriaNombre(producto.idCategoria)
                    )}
                </span>

                <h3>
                    ${escapeHtml(producto.nombre||"Producto")}
                </h3>

                <span class="catalog-card-status">
                    DISPONIBLE
                </span>
            </div>
        `;

        catalogoGrid.appendChild(card);
    });
}

function actualizarVistasProductos(){
    renderCatalogo();
    renderTablaProductosSistema(productosSistema);
    mostrarProductos(productosSistema);
}

async function cargarProductos(){
    try{
        if(listaProductos){
            listaProductos.innerHTML=`
                <tr>
                    <td colspan="3">
                        Cargando productos...
                    </td>
                </tr>
            `;
        }

        const respuesta=await fetch(
            URL_BACKEND+
            "?accion=PRODUCTOS&_="+
            Date.now(),
            {
                method:"GET",
                cache:"no-store"
            }
        );

        if(!respuesta.ok){
            throw new Error(
                "Error HTTP "+respuesta.status
            );
        }

        const resultado=await respuesta.json();

        if(resultado.estado!=="OK"){
            throw new Error(
                resultado.mensaje||
                "No se pudieron cargar los productos."
            );
        }

        productosSistema=
            Array.isArray(resultado.productos)
            ?resultado.productos
            :[];

        actualizarVistasProductos();

        return productosSistema;

    }catch(error){
        console.error(
            "Error cargando productos:",
            error
        );

        if(listaProductos){
            listaProductos.innerHTML=`
                <tr>
                    <td colspan="3">
                        No se pudieron cargar los productos.
                    </td>
                </tr>
            `;
        }

        if(listaProductosCatalogo){
            listaProductosCatalogo.innerHTML=`
                <tr>
                    <td colspan="5">
                        No se pudieron cargar los productos.
                    </td>
                </tr>
            `;
        }

        if(catalogoGrid){
            catalogoGrid.innerHTML=`
                <div class="catalog-empty">
                    <span>⚠️</span>
                    <strong>
                        No se pudo conectar con los productos
                    </strong>
                    <small>
                        Verifica la conexión con Apps Script.
                    </small>
                </div>
            `;
        }

        mensaje(
            error.message||
            "No se pudieron cargar los productos."
        );

        return [];
    }
}

function configurarCatalogo(){
    document
        .querySelectorAll(".catalog-filter-btn")
        .forEach(btn=>{
            btn.addEventListener("click",()=>{
                categoriaCatalogoActual=
                    btn.dataset.cat||
                    "TODAS";

                document
                    .querySelectorAll(".catalog-filter-btn")
                    .forEach(item=>{
                        item.classList.remove("active");
                    });

                btn.classList.add("active");

                renderCatalogo();
            });
        });

    if(btnActualizarCatalogo){
        btnActualizarCatalogo.addEventListener(
            "click",
            cargarProductos
        );
    }

    if(btnActualizarProductosCatalogo){
        btnActualizarProductosCatalogo.addEventListener(
            "click",
            cargarProductos
        );
    }
}

function obtenerIconoProducto(nombre){
    const n=String(nombre||"")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"");

    const reglas=[
        [["sandia","patilla"],"🍉"],
        [["uva","uvas"],"🍇"],
        [["fresa","fresas"],"🍓"],
        [["mango","mangos"],"🥭"],
        [["pina","pinas"],"🍍"],
        [["limon","limones"],"🍋"],
        [["ciruela","ciruelas"],"🟣"],
        [["tamarindo"],"🟤"],
        [["guanabana"],"🟢"],
        [["chicha morada"],"🟣"],
        [["arandano","arandanos"],"🫐"],
        [["maracuya"],"🥭"],
        [["maracumango"],"🥭"],
        [["maracupina"],"🍍"],
        [["manguillo"],"🥭"],
        [["coco","cocol"],"🥥"],
        [["algarrobina"],"🟤"],
        [["vainilla"],"🍦"],
        [["chocolate"],"🍫"],
        [["mani"],"🥜"],
        [["lucuma"],"🟢"],
        [["capuchino","cafe"],"☕"],
        [["oreo"],"🍪"],
        [["menta"],"🌿"],
        [["pie de limon"],"🍋"],
        [["choco moro","choco chips"],"🍫"],
        [["dulce de leche"],"🍯"],
        [["moccachino"],"☕"],
        [["sublime"],"🍫"],
        [["disco sour"],"🍭"]
    ];

    for(const [palabras,icono] of reglas){
        if(
            palabras.some(
                palabra=>n.includes(palabra)
            )
        ){
            return icono;
        }
    }

    return "🍧";
}

function actualizarIconoAutomatico(){
    if(!registroNombreInput||!registroIconoInput)return;

    registroIconoInput.value=
        obtenerIconoProducto(
            registroNombreInput.value
        );
}

function mostrarMensajeRegistro(
    texto,
    tipo="ok"
){
    if(!mensajeRegistroProducto)return;

    mensajeRegistroProducto.hidden=false;

    mensajeRegistroProducto.className=
        "form-message "+tipo;

    mensajeRegistroProducto.textContent=texto;
}

function configurarRegistroProducto(){
    if(
        registroNombreInput&&
        registroIconoInput
    ){
        registroNombreInput.addEventListener(
            "input",
            actualizarIconoAutomatico
        );

        actualizarIconoAutomatico();
    }

    if(!formRegistroProducto)return;

    formRegistroProducto.addEventListener(
        "submit",
        async evento=>{
            evento.preventDefault();

            const nombre=
                $("registroNombre")?.value.trim()||"";

            const idCategoria=
                $("registroCategoria")?.value||"";

            const icono=
                obtenerIconoProducto(nombre);

            const estado=
                $("registroEstado")?.value||
                "DISPONIBLE";

            const activo=
                $("registroActivo")?.value||
                "SI";

            if(!nombre||!idCategoria){
                mostrarMensajeRegistro(
                    "Completa los campos obligatorios.",
                    "error"
                );
                return;
            }

            if(btnGuardarProducto){
                btnGuardarProducto.disabled=true;
            }

            mostrarMensajeRegistro(
                "Registrando producto...",
                "ok"
            );

            try{
                const resultado=
                    await enviar(
                        "CREAR_PRODUCTO",
                        "",
                        {
                            nombreProducto:nombre,
                            idCategoria:idCategoria,
                            icono:icono,
                            estado:estado,
                            activo:activo
                        }
                    );

                if(resultado.estado!=="OK"){
                    throw new Error(
                        resultado.mensaje||
                        "No se pudo registrar el producto."
                    );
                }

                mostrarMensajeRegistro(
                    resultado.mensaje||
                    "Producto registrado correctamente.",
                    "ok"
                );

                formRegistroProducto.reset();

                actualizarIconoAutomatico();

                await cargarProductos();

            }catch(error){
                console.error(error);

                mostrarMensajeRegistro(
                    error.message||
                    "No se pudo registrar el producto.",
                    "error"
                );

            }finally{
                if(btnGuardarProducto){
                    btnGuardarProducto.disabled=false;
                }
            }
        }
    );
}

function temaAutomatico(){
    return temasPorMes[
        new Date().getMonth()+1
    ]||"auto";
}

let temaRoxyActual="auto";

function obtenerTema(){
    return temaRoxyActual;
}

function aplicarTema(){

    const configurado=temaRoxyActual||"auto";

    const tema=
        configurado==="auto"
        ?temaAutomatico()
        :configurado;

    document.body.dataset.theme=tema;
    aplicarEstilosTemaDashboard(tema);

    const nombre=
        nombresTemas[tema]||
        "Roxy";

    if(temaActualBadge){

        temaActualBadge.textContent=
            configurado==="auto"
            ?"Automática · "+nombre
            :nombre;

    }

    document
        .querySelectorAll(".theme-card")
        .forEach(card=>{

            card.classList.toggle(
                "selected",
                card.dataset.theme===configurado
            );

        });

    const previewTitle=
        $("themePreviewTitle");

    const previewText=
        $("themePreviewText");

    const preview=
        $("themePreview");

    if(previewTitle){
        previewTitle.textContent=nombre;
    }

    if(previewText){

        if(tema==="halloween"){

            previewText.textContent=
                "🎃 Octubre · temporada Halloween";

        }else if(tema==="navidad"){

            previewText.textContent=
                "🎄 Diciembre · temporada Navidad";

        }else if(tema==="amor"){

            previewText.textContent=
                "❤️ Febrero · Día del Amor";

        }else if(tema==="madre"){

            previewText.textContent=
                "🌷 Mayo · Día de la Madre";

        }else if(tema==="padre"){

            previewText.textContent=
                "👔 Junio · Día del Padre";

        }else{

            previewText.textContent=
                "Temática activa de Cremoladas Roxy";

        }

    }

    if(preview){
        preview.dataset.theme=tema;
    }

}

async function cargarTemaRoxy(){

    try{

        const respuesta=
            await fetch(
                URL_BACKEND+
                "?accion=CONFIG&_="+
                Date.now(),
                {
                    method:"GET",
                    cache:"no-store"
                }
            );

        if(!respuesta.ok){

            throw new Error(
                "Error HTTP "+
                respuesta.status
            );

        }

        const resultado=
            await respuesta.json();

        if(resultado.estado!=="OK"){

            throw new Error(
                resultado.mensaje||
                "No se pudo cargar la temática."
            );

        }

        const tema=
            resultado.config?.TEMA_ACTUAL||
            "auto";

        temaRoxyActual=
            String(tema)
                .trim()
                .toLowerCase();

        aplicarTema();

    }catch(error){

        console.error(
            "Error cargando temática:",
            error
        );

        temaRoxyActual="auto";

        aplicarTema();

    }

}

function aplicarEstilosTemaDashboard(tema){

    const estilos={
        auto:{
            accent:"#5125A6",
            accent2:"#7C3AED",
            soft:"#F3F0FF",
            page:"#E8EDF5",
            card:"#FFFFFF",
            hero1:"#5B21B6",
            hero2:"#3B0764"
        },
        halloween:{
            accent:"#F97316",
            accent2:"#FB923C",
            soft:"#FFF7ED",
            page:"#E8EDF5",
            card:"#FFFFFF",
            hero1:"#C2410C",
            hero2:"#431407"
        },
        navidad:{
            accent:"#B91C1C",
            accent2:"#16A34A",
            soft:"#FEF2F2",
            page:"#E8EDF5",
            card:"#FFFFFF",
            hero1:"#991B1B",
            hero2:"#14532D"
        },
        amor:{
            accent:"#E11D48",
            accent2:"#FB7185",
            soft:"#FFF1F2",
            page:"#FCE7EF",
            card:"#FFFFFF",
            hero1:"#BE123C",
            hero2:"#881337"
        },
        madre:{
            accent:"#DB2777",
            accent2:"#EC4899",
            soft:"#FDF2F8",
            page:"#FCE7F3",
            card:"#FFFFFF",
            hero1:"#BE185D",
            hero2:"#831843"
        },
        padre:{
            accent:"#2563EB",
            accent2:"#3B82F6",
            soft:"#EFF6FF",
            page:"#E8F1FF",
            card:"#FFFFFF",
            hero1:"#1D4ED8",
            hero2:"#1E3A8A"
        }
    };

    const temaSeguro=
        estilos[tema]||
        estilos.auto;

    let style=document.getElementById(
        "roxyThemeDashboardDynamic"
    );

    if(!style){
        style=document.createElement("style");
        style.id="roxyThemeDashboardDynamic";
        document.head.appendChild(style);
    }

    style.textContent=`
        body[data-theme="${tema}"]{
            --roxy-accent:${temaSeguro.accent};
            --roxy-accent-2:${temaSeguro.accent2};
            --roxy-accent-soft:${temaSeguro.soft};
            --roxy-page:${temaSeguro.page};
            --roxy-hero-1:${temaSeguro.hero1};
            --roxy-hero-2:${temaSeguro.hero2};
        }

        body[data-theme="${tema}"] .sidebar{
            border-right-color:var(--border-color);
        }

        body[data-theme="${tema}"] .brand-name{
            color:var(--roxy-accent);
        }

        body[data-theme="${tema}"] .brand-name span{
            color:var(--roxy-accent-2);
        }

        body[data-theme="${tema}"] .nav-item.active{
            background:var(--roxy-accent);
            color:#FFFFFF;
            box-shadow:0 8px 18px color-mix(in srgb,var(--roxy-accent) 25%,transparent);
        }

        body[data-theme="${tema}"] .search-btn{
            background:var(--roxy-accent);
        }

        body[data-theme="${tema}"] .search-btn:hover{
            background:var(--roxy-accent-2);
        }

        body[data-theme="${tema}"] .kpi-card{
            background:linear-gradient(135deg,var(--roxy-hero-1),var(--roxy-hero-2));
            box-shadow:0 10px 20px color-mix(in srgb,var(--roxy-accent) 22%,transparent);
        }

        body[data-theme="${tema}"] .table-header h2{
            color:var(--roxy-accent);
        }

        body[data-theme="${tema}"] .btn-view-all{
            background:var(--roxy-accent);
        }

        body[data-theme="${tema}"] .btn-view-all:hover{
            background:var(--roxy-accent-2);
        }

        body[data-theme="${tema}"] .product-status-select:focus{
            border-color:var(--roxy-accent);
            box-shadow:0 0 0 3px color-mix(in srgb,var(--roxy-accent) 15%,transparent);
        }

        body[data-theme="${tema}"] .module-section{
            border-top-color:var(--roxy-accent);
        }

        body[data-theme="${tema}"] .theme-current-badge{
            background:var(--roxy-accent-soft);
            color:var(--roxy-accent);
        }

        body[data-theme="${tema}"] .theme-card.selected{
            border-color:var(--roxy-accent);
            background:var(--roxy-accent-soft);
        }

        body[data-theme="${tema}"] .theme-card:hover{
            border-color:var(--roxy-accent-2);
        }

        body[data-theme="${tema}"] .submenu-item:hover,
        body[data-theme="${tema}"] .submenu-item.active{
            background:var(--roxy-accent-soft);
            color:var(--roxy-accent);
        }
    `;
}

function configurarTematica(){

    document
        .querySelectorAll(".theme-card")
        .forEach(card=>{

            card.addEventListener(
                "click",
                async()=>{

                    const tema=
                        card.dataset.theme||
                        "auto";

                    try{

                        card.disabled=true;

                        const respuesta=
                            await fetch(
                                URL_BACKEND,
                                {
                                    method:"POST",
                                    headers:{
                                        "Content-Type":
                                            "text/plain;charset=utf-8"
                                    },
                                    body:
                                        JSON.stringify({
                                            nombre:cajero,
                                            accion:"CAMBIAR_TEMA",
                                            sessionId:sessionId,
                                            operationId:"",
                                            tema:tema
                                        })
                                }
                            );

                        if(!respuesta.ok){

                            throw new Error(
                                "Error HTTP "+
                                respuesta.status
                            );

                        }

                        const resultado=
                            await respuesta.json();

                        if(resultado.estado!=="OK"){

                            throw new Error(
                                resultado.mensaje||
                                "No se pudo cambiar la temática."
                            );

                        }

                        temaRoxyActual=
                            resultado.tema||
                            tema;

                        aplicarTema();

                        mensaje(
                            "Temática seleccionada: "+
                            (
                                nombresTemas[tema]||
                                tema
                            )
                        );

                    }catch(error){

                        console.error(error);

                        mensaje(
                            error.message||
                            "No se pudo guardar la temática."
                        );

                    }finally{

                        card.disabled=false;

                    }

                }
            );

        });

}


let pedidosSistema=[];
let filtroPedidosActual="TODOS";
let intervaloPedidos=null;

const listaPedidos=$("listaPedidos");
const pedidoVacio=$("pedidoVacio");
const pedidoMensaje=$("pedidoMensaje");
const pedidoBuscador=$("pedidoBuscador");
const btnActualizarPedidos=$("btnActualizarPedidos");
const pedidoKpiPendientes=$("pedidoKpiPendientes");
const pedidoKpiPagados=$("pedidoKpiPagados");
const pedidoKpiPreparacion=$("pedidoKpiPreparacion");
const pedidoKpiListos=$("pedidoKpiListos");
const pedidoKpiVentas=$("pedidoKpiVentas");

function moneyPedido(valor){
    const numero=Number(valor||0);
    return "S/. "+numero.toFixed(2);
}

function mensajePedido(texto,tipo=""){
    if(!pedidoMensaje)return;
    pedidoMensaje.textContent=texto||"";
    pedidoMensaje.hidden=!texto;
    pedidoMensaje.className="pedido-mensaje"+(tipo?" "+tipo:"");
}

function estadoPedidoNormalizado(valor){
    return normalizar(valor).replace("PREPARACION","PREPARACIÓN");
}

function claseEstadoPedido(estado){
    const e=normalizar(estado);
    if(e==="PENDIENTE")return "pedido-estado pendiente";
    if(e==="CONFIRMADO")return "pedido-estado confirmado";
    if(e==="EN PREPARACION")return "pedido-estado preparacion";
    if(e==="LISTO")return "pedido-estado listo";
    if(e==="ENTREGADO")return "pedido-estado entregado";
    if(e==="CANCELADO")return "pedido-estado cancelado";
    return "pedido-estado pendiente";
}

function claseEstadoPago(estado){
    const e=normalizar(estado);
    if(e==="PAGADO")return "pago-estado pagado";
    if(e==="PAGO RECHAZADO")return "pago-estado rechazado";
    return "pago-estado pendiente";
}

function textoEstadoPedido(estado){
    const e=normalizar(estado);
    if(e==="EN PREPARACION")return "EN PREPARACIÓN";
    return String(estado||"PENDIENTE").toUpperCase();
}

function textoMetodoPago(metodo){
    const m=normalizar(metodo);
    if(m==="YAPE")return "💜 Yape";
    if(m==="PLIN")return "💚 Plin";
    if(m==="EFECTIVO")return "💵 Efectivo";
    return String(metodo||"—");
}

function textoPago(estado){
    const e=normalizar(estado);
    if(e==="PAGADO")return "🟢 PAGADO";
    if(e==="PAGO RECHAZADO")return "🔴 PAGO RECHAZADO";
    return "🟡 PENDIENTE";
}

function obtenerItemsResumen(pedido){
    const items=Array.isArray(pedido.items)?pedido.items:[];
    if(!items.length)return "Sin detalle";
    return items.map(item=>{
        const cantidad=Math.max(1,Number(item.cantidad||1));
        return `${cantidad} × ${item.nombreProducto||"Producto"}`;
    }).join(" · ");
}

function pedidoCoincideFiltro(pedido){
    const filtro=filtroPedidosActual;
    const pago=normalizar(pedido.estadoPago);
    const estado=normalizar(pedido.estadoPedido);

    if(filtro==="PAGO")return pago==="PENDIENTE";
    if(filtro==="RECHAZADO")return pago==="PAGO RECHAZADO";
    if(filtro==="CONFIRMADO")return estado==="CONFIRMADO";
    if(filtro==="PREPARACION")return estado==="EN PREPARACION";
    if(filtro==="LISTO")return estado==="LISTO";
    if(filtro==="ENTREGADO")return estado==="ENTREGADO";
    return true;
}

function pedidoCoincideBusqueda(pedido){
    const termino=normalizar(pedidoBuscador?.value||"");
    if(!termino)return true;
    const base=[
        pedido.idPedido,
        pedido.nombreCliente,
        pedido.ticket,
        pedido.metodoPago,
        pedido.estadoPago,
        pedido.estadoPedido,
        ...(Array.isArray(pedido.items)?pedido.items.map(x=>x.nombreProducto):[])
    ].join(" ");
    return normalizar(base).includes(termino);
}

function actualizarKpisPedidos(){
    const pedidos=Array.isArray(pedidosSistema)?pedidosSistema:[];
    const pendientes=pedidos.filter(p=>normalizar(p.estadoPago)==="PENDIENTE").length;
    const pagados=pedidos.filter(p=>normalizar(p.estadoPago)==="PAGADO").length;
    const preparacion=pedidos.filter(p=>normalizar(p.estadoPedido)==="EN PREPARACION").length;
    const listos=pedidos.filter(p=>normalizar(p.estadoPedido)==="LISTO").length;
    const ventas=pedidos
        .filter(p=>normalizar(p.estadoPago)==="PAGADO")
        .reduce((s,p)=>s+Number(p.total||0),0);

    if(pedidoKpiPendientes)pedidoKpiPendientes.textContent=pendientes;
    if(pedidoKpiPagados)pedidoKpiPagados.textContent=pagados;
    if(pedidoKpiPreparacion)pedidoKpiPreparacion.textContent=preparacion;
    if(pedidoKpiListos)pedidoKpiListos.textContent=listos;
    if(pedidoKpiVentas)pedidoKpiVentas.textContent=moneyPedido(ventas);

    const kpiVentas=$("kpiVentas");
    const kpiVasos=$("kpiVasos");
    const kpiSabores=$("kpiSabores");
    const kpiDisponibilidad=$("kpiDisponibilidad");

    if(kpiVentas)kpiVentas.textContent=moneyPedido(ventas);

    if(kpiVasos){
        const vasos=pedidos
            .filter(p=>normalizar(p.estadoPago)==="PAGADO")
            .reduce((s,p)=>s+(Array.isArray(p.items)?p.items.reduce((a,i)=>a+Number(i.cantidad||0),0):0),0);
        kpiVasos.textContent=vasos;
    }

    if(kpiSabores){
        kpiSabores.textContent=productosSistema.filter(productoDisponible).length;
    }

    if(kpiDisponibilidad){
        const totalProductos=productosSistema.filter(p=>normalizar(p.activo||"SI")!=="NO").length;
        const disponibles=productosSistema.filter(productoDisponible).length;
        kpiDisponibilidad.textContent=(totalProductos?Math.round(disponibles*100/totalProductos):0)+"%";
    }
}

function crearControlPago(pedido){
    const actual=normalizar(pedido.estadoPago);
    const select=document.createElement("select");
    select.className="pedido-pago-select";
    select.dataset.idPedido=pedido.idPedido;
    select.innerHTML=`
        <option value="">${textoPago(pedido.estadoPago)}</option>
        <option value="PAGADO">🟢 PAGADO</option>
        <option value="PAGO RECHAZADO">🔴 PAGO RECHAZADO</option>
    `;
    select.value="";
    select.addEventListener("change",async()=>{
        const nuevo=select.value;
        if(!nuevo)return;
        const confirmado=confirm(
            nuevo==="PAGADO"
            ?"¿Confirmar que el pago fue verificado y recibido?"
            :"¿Confirmar que el pago fue rechazado?"
        );
        if(!confirmado){
            select.value="";
            return;
        }
        await cambiarPagoPedido(pedido.idPedido,nuevo,select);
    });
    if(actual==="PAGADO"){
        select.classList.add("estado-pagado");
    }else if(actual==="PAGO RECHAZADO"){
        select.classList.add("estado-rechazado");
    }
    return select;
}

function crearAccionesPedido(pedido){
    const contenedor=document.createElement("div");
    contenedor.className="pedido-acciones";

    const pago=normalizar(pedido.estadoPago);
    const estado=normalizar(pedido.estadoPedido);

    if(pago==="PENDIENTE"||pago==="PAGO RECHAZADO"){
        contenedor.appendChild(crearControlPago(pedido));
    }

    if(pago==="PAGADO"&&estado==="CONFIRMADO"){
        const boton=document.createElement("button");
        boton.type="button";
        boton.className="pedido-btn preparar";
        boton.textContent="Preparar";
        boton.addEventListener("click",()=>cambiarEstadoPedidoSistema(pedido.idPedido,"EN PREPARACIÓN"));
        contenedor.appendChild(boton);
    }

    if(pago==="PAGADO"&&estado==="EN PREPARACION"){
        const boton=document.createElement("button");
        boton.type="button";
        boton.className="pedido-btn listo";
        boton.textContent="Marcar listo";
        boton.addEventListener("click",()=>cambiarEstadoPedidoSistema(pedido.idPedido,"LISTO"));
        contenedor.appendChild(boton);
    }

    if(pago==="PAGADO"&&estado==="LISTO"){
        const boton=document.createElement("button");
        boton.type="button";
        boton.className="pedido-btn entregar";
        boton.textContent="Entregado";
        boton.addEventListener("click",()=>cambiarEstadoPedidoSistema(pedido.idPedido,"ENTREGADO"));
        contenedor.appendChild(boton);
    }

    if(estado!=="ENTREGADO"&&estado!=="CANCELADO"){
        const botonCancelar=document.createElement("button");
        botonCancelar.type="button";
        botonCancelar.className="pedido-btn cancelar";
        botonCancelar.textContent="Cancelar";
        botonCancelar.addEventListener("click",()=>{
            const ok=confirm("¿Cancelar el pedido "+pedido.idPedido+"?");
            if(ok)cambiarEstadoPedidoSistema(pedido.idPedido,"CANCELADO");
        });
        contenedor.appendChild(botonCancelar);
    }

    return contenedor;
}

function renderPedidos(){
    if(!listaPedidos)return;

    const filtrados=pedidosSistema
        .filter(pedidoCoincideFiltro)
        .filter(pedidoCoincideBusqueda);

    listaPedidos.innerHTML="";

    if(pedidoVacio){
        pedidoVacio.hidden=filtrados.length>0;
    }

    if(!filtrados.length){
        listaPedidos.innerHTML='<tr><td colspan="8" class="pedido-empty-row">No hay pedidos para este filtro.</td></tr>';
        return;
    }

    filtrados.forEach(pedido=>{
        const fila=document.createElement("tr");
        const items=Array.isArray(pedido.items)?pedido.items:[];
        const detalleId="pedidoDetalle_"+String(pedido.idPedido).replace(/[^a-zA-Z0-9_-]/g,"");

        fila.innerHTML=`
            <td>
                <div class="pedido-identidad">
                    <strong>${escapeHtml(pedido.idPedido||"—")}</strong>
                    <span>${escapeHtml(pedido.fecha||"")} ${escapeHtml(pedido.hora||"")}</span>
                    ${pedido.ticket?`<small>Ticket ${escapeHtml(pedido.ticket)}</small>`:""}
                </div>
            </td>
            <td>
                <div class="pedido-cliente">
                    <strong>${escapeHtml(pedido.nombreCliente||"Cliente")}</strong>
                </div>
            </td>
            <td>
                <details class="pedido-detalle" id="${detalleId}">
                    <summary>${escapeHtml(obtenerItemsResumen(pedido))}</summary>
                    <div class="pedido-items">
                        ${items.length?items.map(item=>`
                            <div class="pedido-item">
                                <span>${escapeHtml(item.nombreProducto||"Producto")}</span>
                                <strong>×${Number(item.cantidad||0)}</strong>
                                <span>${moneyPedido(item.subtotal)}</span>
                            </div>
                        `).join(""):'<span>Sin productos registrados.</span>'}
                    </div>
                </details>
            </td>
            <td><strong class="pedido-total">${moneyPedido(pedido.total)}</strong></td>
            <td><span class="pedido-metodo">${textoMetodoPago(pedido.metodoPago)}</span></td>
            <td class="pedido-pago-cell"></td>
            <td>
                <span class="${claseEstadoPedido(pedido.estadoPedido)}">
                    ${escapeHtml(textoEstadoPedido(pedido.estadoPedido))}
                </span>
            </td>
            <td class="pedido-accion-cell"></td>
        `;

        const pagoCell=fila.querySelector(".pedido-pago-cell");
        if(pagoCell){
            const pago=normalizar(pedido.estadoPago);
            if(pago==="PENDIENTE"||pago==="PAGO RECHAZADO"){
                pagoCell.appendChild(crearControlPago(pedido));
            }else{
                const badge=document.createElement("span");
                badge.className=claseEstadoPago(pedido.estadoPago);
                badge.textContent=textoPago(pedido.estadoPago);
                pagoCell.appendChild(badge);
            }
        }

        const accionCell=fila.querySelector(".pedido-accion-cell");
        if(accionCell)accionCell.appendChild(crearAccionesPedido(pedido));

        listaPedidos.appendChild(fila);
    });
}

async function cargarPedidos(silencioso=false){
    try{
        const respuesta=await fetch(
            URL_BACKEND+"?accion=PEDIDOS&_="+Date.now(),
            {
                method:"GET",
                cache:"no-store"
            }
        );

        if(!respuesta.ok){
            throw new Error("Error HTTP "+respuesta.status);
        }

        const resultado=await respuesta.json();

        if(resultado.estado!=="OK"){
            throw new Error(resultado.mensaje||"No se pudieron cargar los pedidos.");
        }

        pedidosSistema=Array.isArray(resultado.pedidos)?resultado.pedidos:[];
        actualizarKpisPedidos();
        renderPedidos();

        if(!silencioso){
            mensajePedido(
                pedidosSistema.length
                ?"Pedidos actualizados."
                :"No hay pedidos registrados.",
                pedidosSistema.length?"ok":""
            );
        }

        return pedidosSistema;
    }catch(error){
        console.error(error);
        if(!silencioso){
            mensajePedido(
                error.message||"No se pudieron cargar los pedidos.",
                "error"
            );
        }
        return [];
    }
}

async function cambiarPagoPedido(idPedido,estadoPago,control){
    if(control)control.disabled=true;
    mensajePedido(
        estadoPago==="PAGADO"
        ?"Verificando pago..."
        :"Registrando rechazo del pago..."
    );

    try{
        const resultado=await enviar(
            "CAMBIAR_ESTADO_PAGO",
            "",
            {
                idPedido:idPedido,
                estadoPago:estadoPago,
                usuario:cajero
            }
        );

        if(resultado.estado!=="OK"){
            throw new Error(resultado.mensaje||"No se pudo actualizar el pago.");
        }

        mensajePedido(
            resultado.mensaje||
            (estadoPago==="PAGADO"?"Pago confirmado.":"Pago rechazado."),
            "ok"
        );

        await cargarPedidos(true);
    }catch(error){
        console.error(error);
        mensajePedido(error.message||"No se pudo actualizar el pago.","error");
        if(control)control.disabled=false;
    }
}

async function cambiarEstadoPedidoSistema(idPedido,estadoPedido){
    mensajePedido("Actualizando estado del pedido...");

    try{
        const resultado=await enviar(
            "CAMBIAR_ESTADO_PEDIDO",
            "",
            {
                idPedido:idPedido,
                estadoPedido:estadoPedido,
                usuario:cajero
            }
        );

        if(resultado.estado!=="OK"){
            throw new Error(resultado.mensaje||"No se pudo actualizar el estado.");
        }

        mensajePedido(resultado.mensaje||"Estado actualizado.","ok");
        await cargarPedidos(true);
    }catch(error){
        console.error(error);
        mensajePedido(error.message||"No se pudo actualizar el estado.","error");
    }
}

function configurarPedidos(){
    if(btnActualizarPedidos){
        btnActualizarPedidos.addEventListener("click",()=>cargarPedidos(false));
    }

    if(pedidoBuscador){
        pedidoBuscador.addEventListener("input",renderPedidos);
    }

    document.querySelectorAll(".pedido-filtro").forEach(boton=>{
        boton.addEventListener("click",()=>{
            filtroPedidosActual=boton.dataset.filtro||"TODOS";
            document.querySelectorAll(".pedido-filtro").forEach(item=>item.classList.remove("active"));
            boton.classList.add("active");
            renderPedidos();
        });
    });

    cargarPedidos(true);

    if(intervaloPedidos)clearInterval(intervaloPedidos);
    intervaloPedidos=setInterval(()=>cargarPedidos(true),5000);
}


function cerrarSecciones(){
    [
        seccionProductos,
        seccionRegistroProducto,
        seccionCatalogo,
        seccionTablaProductos,
        seccionPedido,
        seccionTematica
    ]
    .filter(Boolean)
    .forEach(section=>{
        section.hidden=true;
    });
}

function activarSubmenu(id){
    document
        .querySelectorAll(".submenu-item")
        .forEach(item=>{
            item.classList.remove("active");
        });

    const item=$(id);

    if(item){
        item.classList.add("active");
    }
}

function mostrarModulo(modulo){
    cerrarSecciones();

    if(modulo==="registro"&&seccionRegistroProducto){
        seccionRegistroProducto.hidden=false;
    }

    if(modulo==="catalogo"&&seccionCatalogo){
        seccionCatalogo.hidden=false;
        renderCatalogo();
    }

    if(modulo==="tabla"&&seccionTablaProductos){
        seccionTablaProductos.hidden=false;
        renderTablaProductosSistema(
            productosSistema
        );
    }

    if(modulo==="pedido"&&seccionPedido){
        seccionPedido.hidden=false;
        cargarPedidos(true);
    }

    if(modulo==="tematica"&&seccionTematica){
        seccionTematica.hidden=false;
        aplicarTema();
    }
}

function alternarProductos(){
    if(!submenuProductos)return;

    const debeAbrir=
        submenuProductos.hidden;

    submenuProductos.hidden=
        !debeAbrir;

    if(grupoProductos){
        grupoProductos.classList.toggle(
            "open",
            debeAbrir
        );
    }
}

function configurarNavegacion(){
    if(navProductos){
        navProductos.addEventListener(
            "click",
            evento=>{
                evento.preventDefault();
                alternarProductos();
            }
        );
    }

    if(subRegistroProducto){
        subRegistroProducto.addEventListener(
            "click",
            evento=>{
                evento.preventDefault();
                activarSubmenu(
                    "subRegistroProducto"
                );
                mostrarModulo("registro");
            }
        );
    }

    if(subCatalogo){
        subCatalogo.addEventListener(
            "click",
            evento=>{
                evento.preventDefault();
                activarSubmenu("subCatalogo");
                mostrarModulo("catalogo");
            }
        );
    }

    if(subTablaProductos){
        subTablaProductos.addEventListener(
            "click",
            evento=>{
                evento.preventDefault();
                activarSubmenu(
                    "subTablaProductos"
                );
                mostrarModulo("tabla");
            }
        );
    }

    if(subPedido){
        subPedido.addEventListener(
            "click",
            evento=>{
                evento.preventDefault();
                activarSubmenu("subPedido");
                mostrarModulo("pedido");
            }
        );
    }

    if(navTematica){
        navTematica.addEventListener(
            "click",
            evento=>{
                evento.preventDefault();

                document
                    .querySelectorAll(".nav-item")
                    .forEach(item=>{
                        item.classList.remove(
                            "active"
                        );
                    });

                navTematica.classList.add("active");

                mostrarModulo("tematica");
            }
        );
    }
}

async function iniciar(){
    configurarTV();
    configurarNavegacion();
    configurarCatalogo();
    configurarRegistroProducto();
    configurarTematica();
    configurarPedidos();

    cargarTemaRoxy();
    setInterval(cargarTemaRoxy,10000);

    if(submenuProductos){
        submenuProductos.hidden=true;
    }

    if(grupoProductos){
        grupoProductos.classList.remove(
            "open"
        );
    }

    if(btnAtendiendo){
        btnAtendiendo.addEventListener(
            "click",
            registrarAtendiendo
        );
    }

    if(btnBreak){
        btnBreak.addEventListener(
            "click",
            ()=>{
                ejecutar("BREAK");
            }
        );
    }

    if(btnPausa){
        btnPausa.addEventListener(
            "click",
            ()=>{
                ejecutar("PAUSA");
            }
        );
    }

    if(btnTermino){
        btnTermino.addEventListener(
            "click",
            ()=>{
                ejecutar(
                    "TERMINO DE TURNO"
                );
            }
        );
    }

    if(btnEntregado){
        btnEntregado.addEventListener(
            "click",
            registrarEntregado
        );
    }

    if(btnActualizarProductos){
        btnActualizarProductos.addEventListener(
            "click",
            cargarProductos
        );
    }

    if(modo==="ENTREGA"){
        if(textoEstado){
            textoEstado.textContent=
                "ATENDIENDO";
        }

        if(estadoPunto){
            estadoPunto.style.background=
                "#2563eb";
        }

        if(entregaPendiente){
            entregaPendiente.hidden=false;
        }

        bloquearTurno(true);
    }

    cargarProductos();
    cargarPedidos(true);
}

if(document.readyState==="loading"){
    document.addEventListener(
        "DOMContentLoaded",
        iniciar
    );
}else{
    iniciar();
}