import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  LayoutDashboard,
  Users,
  Package,
  Zap,
  Wallet,
  Activity,
  Search,
  Trash2,
  Plus,
  Clock,
  TrendingUp,
  Layers,
  X,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Download,
  Lock,
  Mail,
  AlertCircle,
  DollarSign,
  PieChart,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [emailLogin, setEmailLogin] = useState('');
  const [passLogin, setPassLogin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [vista, setVista] = useState('dashboard');
  const [inventario, setInventario] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [tc, setTc] = useState(() => {
    return localStorage.getItem('tc_aluria') || '3.42';
  });

  useEffect(() => {
    localStorage.setItem('tc_aluria', tc);
  }, [tc]);

  // Autenticación Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sincronización y Realtime
  useEffect(() => {
    if (!session) return;
    cargarDatos();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  async function cargarDatos() {
    try {
      setCargando(true);
      const { data: inv } = await supabase.from('inventario').select('*');
      const { data: cli } = await supabase.from('clientes').select('*');
      const { data: pag } = await supabase.from('pagos').select('*');
      if (inv) setInventario(inv);
      if (cli) setClientes(cli);
      if (pag) setPagos(pag);
    } catch (error) {
      console.error('Error al sincronizar con Supabase', error);
    } finally {
      setCargando(false);
    }
  }

  // --- LOGIN ---
  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password: passLogin,
      });
      if (error) throw error;
    } catch (error) {
      alert('Error de autenticación: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // --- EXPORTAR A CSV ---
  function exportarACSV(data, filename) {
    if (!data || data.length === 0) return alert('No hay datos para exportar.');
    const keys = Object.keys(data[0]);
    const csvContent = [
      keys.join(','),
      ...data.map((row) => keys.map((k) => `"${row[k] || ''}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Modales
  const [modalInv, setModalInv] = useState(false);
  const [modalCli, setModalCli] = useState(false);
  const [modalCaja, setModalCaja] = useState(false);

  // Filtros de búsqueda
  const [busquedaInv, setBusquedaInv] = useState('');
  const [busquedaCli, setBusquedaCli] = useState('');
  const [busquedaGestion, setBusquedaGestion] = useState('');
  const [modoResumen, setModoResumen] = useState(false);

  // Estados para Importar Inventario Lote
  const [loteProv, setLoteProv] = useState('');
  const [loteCosto, setLoteCosto] = useState('');
  const [lotePrecio, setLotePrecio] = useState('');
  const [loteCorreos, setLoteCorreos] = useState('');

  // Estados para Control de Gastos
  const [gastoCategoria, setGastoCategoria] = useState('Comida');
  const [gastoConcepto, setGastoConcepto] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoTipo, setGastoTipo] = useState('Egreso');

  // Estados para Nuevo Cliente / Asignación
  const [cliNom, setCliNom] = useState('');
  const [cliNum, setCliNum] = useState('');
  const [cliCuentaAsignada, setCliCuentaAsignada] = useState('');
  const [cliInicio, setCliInicio] = useState('');
  const [cliFin, setCliFin] = useState('');
  const [cliPago, setCliPago] = useState('Pagado');

  const [copiadoIdx, setCopiadoIdx] = useState(null);

  // --- ACCIÓN COBRANZA ---
  async function renovarCobranza(cliente) {
    try {
      const arr = cliente.fin ? cliente.fin.split('-') : [];
      let d =
        arr.length === 3 ? new Date(arr[0], arr[1] - 1, arr[2]) : new Date();
      d.setDate(d.getDate() + 30);
      const nuevaFecha = d.toISOString().split('T')[0];

      const { error } = await supabase
        .from('clientes')
        .update({ fin: nuevaFecha, pago: 'Pagado' })
        .eq('id', cliente.id);
      if (error) throw error;
      alert(
        `¡Cuenta de ${cliente.nombre} renovada exitosamente por 30 días más!`
      );
      cargarDatos();
    } catch (error) {
      alert('Error al renovar: ' + error.message);
    }
  }

  // --- ACCIÓN GESTIÓN DE CUENTAS ---
  async function marcarPagadoProveedor(id) {
    try {
      const { error } = await supabase
        .from('inventario')
        .update({ proveedor_pagado: true })
        .eq('id', id);
      if (error) throw error;
      cargarDatos();
    } catch (error) {
      alert('Error al actualizar pago a proveedor: ' + error.message);
    }
  }

  async function sacarDelStock(id, correo) {
    if (
      !confirm(
        `¿Estás seguro de dar de baja la cuenta ${correo}? Saldrá del stock permanentemente.`
      )
    )
      return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) throw error;
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar cuenta: ' + error.message);
    }
  }

  // --- IMPORTAR LOTE INVENTARIO ---
  async function procesarPegaInventario(e) {
    e.preventDefault();
    const lineas = loteCorreos
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lineas.length === 0) return alert('Sin correos válidos.');

    const setExistentes = new Set(
      inventario.map((i) => i.correo.toLowerCase())
    );
    let nuevas = [];
    let dup = 0;

    for (let i = 0; i < lineas.length; i++) {
      const correoLimpio = lineas[i].toLowerCase();
      if (!setExistentes.has(correoLimpio)) {
        nuevas.push({
          correo: lineas[i],
          proveedor: loteProv,
          costo: parseFloat(loteCosto) || 0,
          precio: parseFloat(lotePrecio) || 0,
          estado: 'Disponible',
          cliente: '',
          proveedor_pagado: false,
        });
        setExistentes.add(correoLimpio);
      } else {
        dup++;
      }
    }

    if (nuevas.length > 0) {
      const { error } = await supabase.from('inventario').insert(nuevas);
      if (error) throw error;
    }

    alert(`✅ Importadas: ${nuevas.length} | ❌ Duplicadas ignoradas: ${dup}`);
    setLoteProv('');
    setLoteCosto('');
    setLotePrecio('');
    setLoteCorreos('');
    setModalInv(false);
  }

  // --- ASIGNAR CLIENTE ---
  async function guardarClienteNuevo(e) {
    e.preventDefault();
    const itemLibre = inventario.find(
      (i) => i.correo === cliCuentaAsignada && i.estado === 'Disponible'
    );

    if (!itemLibre) {
      alert('❌ ERROR: La cuenta ya fue asignada o no existe en stock.');
      return;
    }

    try {
      await supabase
        .from('inventario')
        .update({ estado: 'Asignada', cliente: cliNom })
        .eq('id', itemLibre.id);

      const nuevoCliente = {
        whatsapp: cliNum,
        nombre: cliNom,
        cuenta: `${itemLibre.correo} (${itemLibre.proveedor})`,
        inicio: cliInicio,
        fin: cliFin,
        estado: 'Activo',
        pago: cliPago,
      };

      const { error } = await supabase.from('clientes').insert([nuevoCliente]);
      if (error) throw error;

      setModalCli(false);
      alert('¡Asignado con éxito!');
    } catch (error) {
      alert('Error al guardar cliente: ' + error.message);
    }
  }

  // --- CONTROL DE GASTOS ---
  async function guardarTransaccion(e) {
    e.preventDefault();
    try {
      const conceptoCompleto = `[${gastoCategoria}] ${gastoConcepto}`;
      const nuevaTrans = {
        fecha: new Date().toISOString().split('T')[0],
        concepto: conceptoCompleto,
        monto: parseFloat(gastoMonto),
        tipo: gastoTipo,
      };
      const { error } = await supabase.from('pagos').insert([nuevaTrans]);
      if (error) throw error;

      setGastoConcepto('');
      setGastoMonto('');
      setModalCaja(false);
    } catch (error) {
      alert('Error en control de gastos: ' + error.message);
    }
  }

  async function eliminarCuentaInv(id, correo) {
    if (!confirm(`¿Eliminar cuenta ${correo}?`)) return;
    await supabase.from('inventario').delete().eq('id', id);
  }

  async function eliminarClienteYLiberar(id, cuentaAsignada) {
    if (!confirm('¿Eliminar cliente y liberar cuenta al stock?')) return;
    await supabase.from('clientes').delete().eq('id', id);

    const correoLimpio = cuentaAsignada.split(' (')[0].trim();
    const invMatch = inventario.find((i) => i.correo.trim() === correoLimpio);
    if (invMatch) {
      await supabase
        .from('inventario')
        .update({ estado: 'Disponible', cliente: '' })
        .eq('id', invMatch.id);
    }
  }

  // --- LOGIN ---
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] text-white">
        <div className="p-10 rounded-3xl border border-[#3b0909] bg-[#0d0d0d] w-full max-w-md shadow-2xl shadow-red-950/40 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="text-center space-y-3 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#800f11] to-red-600 mx-auto flex items-center justify-center shadow-lg shadow-red-950">
              <Sparkles className="text-white w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-red-200 to-red-500 bg-clip-text text-transparent">
              Administracion aluria
            </h2>
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Portal Corporativo
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            <div>
              <label className="text-xs text-neutral-300 block mb-2 font-bold uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-red-500" />
                <input
                  type="email"
                  required
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#141414] border border-neutral-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition shadow-inner"
                  placeholder="tucorreo@dominio.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-300 block mb-2 font-bold uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-red-500" />
                <input
                  type="password"
                  required
                  value={passLogin}
                  onChange={(e) => setPassLogin(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#141414] border border-neutral-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl font-bold transition duration-200 shadow-xl shadow-red-950 flex justify-center items-center gap-2 tracking-wide"
            >
              {authLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- CÁLCULOS FINANCIEROS Y FILTROS ---
  const libres = inventario.filter((i) => i.estado === 'Disponible').length;
  const numTc = parseFloat(tc) || 3.42;

  let egresosUsdt = 0;
  let ingresosSoles = 0;
  inventario.forEach((item) => {
    egresosUsdt += parseFloat(item.costo) || 0;
    if (item.estado === 'Asignada')
      ingresosSoles += parseFloat(item.precio) || 0;
  });

  let cajaIngresos = 0;
  let cajaEgresos = 0;
  pagos.forEach((p) => {
    if (p.tipo === 'Ingreso') cajaIngresos += parseFloat(p.monto) || 0;
    else cajaEgresos += parseFloat(p.monto) || 0;
  });

  const egresosTotalesSoles = egresosUsdt * numTc + cajaEgresos;
  const ingresosTotalesSoles = ingresosSoles + cajaIngresos;
  const gananciaNeta = ingresosTotalesSoles - egresosTotalesSoles;

  const hoyStr = new Date().toISOString().split('T')[0];
  const cuentasQueVencenHoy = clientes.filter((c) => c.fin === hoyStr);
  const inventarioGestion = inventario.filter(
    (i) =>
      i.correo.toLowerCase().includes(busquedaGestion.toLowerCase()) ||
      i.proveedor.toLowerCase().includes(busquedaGestion.toLowerCase())
  );

  const gastosComida = pagos
    .filter((p) => p.concepto && p.concepto.includes('[Comida]'))
    .reduce((a, b) => a + parseFloat(b.monto || 0), 0);
  const gastosPasajes = pagos
    .filter((p) => p.concepto && p.concepto.includes('[Pasajes]'))
    .reduce((a, b) => a + parseFloat(b.monto || 0), 0);
  const gastosDetalles = pagos
    .filter((p) => p.concepto && p.concepto.includes('[Detalles]'))
    .reduce((a, b) => a + parseFloat(b.monto || 0), 0);
  const gastosOtros = pagos
    .filter(
      (p) =>
        p.concepto &&
        (p.concepto.includes('[Otros]') || !p.concepto.includes('['))
    )
    .reduce((a, b) => a + parseFloat(b.monto || 0), 0);

  const inventarioFiltrado = inventario.filter(
    (i) =>
      i.correo.toLowerCase().includes(busquedaInv.toLowerCase()) ||
      i.proveedor.toLowerCase().includes(busquedaInv.toLowerCase())
  );

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busquedaCli.toLowerCase()) ||
      c.cuenta.toLowerCase().includes(busquedaCli.toLowerCase()) ||
      c.whatsapp.includes(busquedaCli)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-neutral-100 font-sans relative">
      
      {/* 💻 MENÚ LATERAL (Solo visible en Computadoras / Tablets grandes: md:flex) */}
      <aside className="hidden md:flex w-72 border-r border-[#260505] bg-[#0a0a0a] flex-col justify-between shadow-2xl z-20">
        <div>
          <div className="p-6 border-b border-[#260505] flex items-center gap-3 bg-gradient-to-r from-[#140202] to-transparent">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#800f11] to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-950">
              <Activity className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wide text-white leading-tight">
                Administracion
              </h2>
              <p className="text-xs font-bold text-red-500 tracking-wider">
                aluria
              </p>
            </div>
          </div>
          <nav className="px-4 py-6 space-y-2">
            <BotonesMenu
              icono={<LayoutDashboard />}
              texto="Dashboard"
              vista="dashboard"
              vistaActual={vista}
              setVista={setVista}
            />
            <BotonesMenu
              icono={<Zap className="text-red-500" />}
              texto="Ventas Rápidas"
              vista="ventas"
              vistaActual={vista}
              setVista={setVista}
            />
            <BotonesMenu
              icono={<Package />}
              texto="Inventario"
              vista="inventario"
              vistaActual={vista}
              setVista={setVista}
            />
            <BotonesMenu
              icono={<Users />}
              texto="Clientes"
              vista="clientes"
              vistaActual={vista}
              setVista={setVista}
            />
            <BotonesMenu
              icono={<DollarSign className="text-red-400" />}
              texto="Gestión de Cuentas"
              vista="gestion"
              vistaActual={vista}
              setVista={setVista}
            />
            <BotonesMenu
              icono={<PieChart className="text-amber-500" />}
              texto="Control de Gastos"
              vista="gastos"
              vistaActual={vista}
              setVista={setVista}
            />
          </nav>
        </div>
        <div className="p-4 border-t border-[#260505] bg-[#050505]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-950/30 transition border border-red-900/30 text-sm font-semibold tracking-wide shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 📱 BARRA DE NAVEGACIÓN INFERIOR (Solo visible en Celulares: md:hidden) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0a0a0a] border-t border-[#260505] flex justify-around items-center py-2 px-1 z-40 shadow-2xl">
        <BotonMobile icono={<LayoutDashboard className="w-5 h-5" />} texto="Dash" vista="dashboard" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<Zap className="w-5 h-5 text-red-500" />} texto="Ventas" vista="ventas" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<Package className="w-5 h-5" />} texto="Stock" vista="inventario" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<Users className="w-5 h-5" />} texto="Clientes" vista="clientes" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<DollarSign className="w-5 h-5 text-red-400" />} texto="Cuentas" vista="gestion" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<PieChart className="w-5 h-5 text-amber-500" />} texto="Gastos" vista="gastos" vistaActual={vista} setVista={setVista} />
      </nav>

      {/* CONTENIDO PRINCIPAL (Ocupa 100% de la pantalla operativa en el celular) */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-transparent relative pb-20 md:pb-0">
        <header className="sticky top-0 z-10 px-6 py-4 flex justify-between items-center border-b border-[#260505] bg-[#0a0a0a]/90 backdrop-blur-2xl shadow-sm">
          <div className="flex items-center gap-3">
            {/* Botón de cerrar sesión rápido arriba a la izquierda solo en móvil */}
            <button 
              onClick={handleLogout}
              className="md:hidden p-2 rounded-xl bg-red-950/50 text-red-400 border border-red-900/40"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white capitalize flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              {vista === 'clientes'
                ? 'Clientes'
                : vista === 'ventas'
                ? 'Ventas Rápidas'
                : vista === 'inventario'
                ? 'Inventario'
                : vista === 'gestion'
                ? 'Gestión de Cuentas'
                : vista === 'gastos'
                ? 'Control de Gastos'
                : 'Dashboard'}
            </h1>
          </div>
          <div className="bg-[#141414] border border-[#3b0909] px-4 py-1.5 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-red-950/20">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Libre:
            </span>
            <span className="text-base font-extrabold text-white">
              {cargando ? '...' : libres}
            </span>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-8">
          {cargando ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              {/* VISTA DASHBOARD */}
              {vista === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="p-3.5 rounded-2xl flex items-center gap-4 border border-[#331111] bg-gradient-to-r from-[#140a0a] to-[#0f0707] shadow-xl">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                        TC (USDT/Soles):
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={tc}
                        onChange={(e) => setTc(e.target.value)}
                        className="w-24 px-3 py-1.5 bg-[#050505] border border-red-900/60 rounded-xl text-center font-extrabold text-white text-base focus:outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                      />
                    </div>
                    <button
                      onClick={() => setModalCaja(true)}
                      className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-3 rounded-2xl text-sm font-bold transition border border-red-800/40 flex items-center gap-2 shadow-xl shadow-red-950"
                    >
                      <Wallet className="w-4 h-4 text-red-200" /> Añadir
                      Gasto/Ingreso Extra
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-7 rounded-3xl border-t-4 border-t-red-600 border border-[#2b0d0d] bg-gradient-to-b from-[#140a0a] to-[#0a0505] shadow-2xl relative overflow-hidden">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-3">
                        Ventas + Ingresos (S/)
                      </h3>
                      <p className="text-4xl font-black text-white">
                        S/ {ingresosTotalesSoles.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-7 rounded-3xl border-t-4 border-t-[#6b1414] border border-[#2b0d0d] bg-gradient-to-b from-[#140a0a] to-[#0a0505] shadow-2xl relative overflow-hidden">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-3">
                        Egresos Totales (S/)
                      </h3>
                      <p className="text-4xl font-black text-red-500">
                        S/ {egresosTotalesSoles.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-7 rounded-3xl border-t-4 border-t-neutral-400 border border-[#2b0d0d] bg-gradient-to-b from-[#140a0a] to-[#0a0505] shadow-2xl relative overflow-hidden">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-3">
                        Ganancia Neta (S/)
                      </h3>
                      <p className="text-4xl font-black text-neutral-100">
                        S/ {gananciaNeta.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* COBRANZA */}
                  <div className="p-7 rounded-3xl border border-[#3b0909] bg-gradient-to-r from-[#140a0a] via-[#0d0707] to-[#080404] space-y-5 shadow-2xl">
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5">
                      <AlertCircle className="w-6 h-6 text-red-500" /> Cobranza
                      - Cuentas que Vencen Hoy ({hoyStr})
                    </h3>
                    {cuentasQueVencenHoy.length === 0 ? (
                      <p className="text-neutral-400 text-sm font-medium">
                        No hay cuentas que expiren exactamente hoy.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {cuentasQueVencenHoy.map((cli) => (
                          <div
                            key={cli.id}
                            className="flex flex-wrap justify-between items-center bg-[#0a0a0a] p-5 rounded-2xl border border-[#2b0d0d] gap-4 shadow-md"
                          >
                            <div>
                              <p className="font-bold text-white text-base">
                                {cli.nombre}{' '}
                                <span className="text-xs text-neutral-400 font-normal">
                                  ({cli.whatsapp})
                                </span>
                              </p>
                              <p className="text-xs text-red-400 font-mono mt-0.5">
                                {cli.cuenta}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <a
                                href={`https://wa.me/${cli.whatsapp}?text=Hola%20${cli.nombre},%20tu%20cuenta%20vence%20hoy.%20¿Deseas%20renovar%20por%2030%20días%20más?`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#1f0a0a] hover:bg-[#331111] text-red-300 border border-red-900/40 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                              >
                                Cobrar Wp
                              </a>
                              <button
                                onClick={() => renovarCobranza(cli)}
                                className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-red-950 flex items-center gap-1.5"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Renovar 30
                                días más
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deudas y Vencimientos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-7 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] space-y-4 shadow-xl">
                      <h3 className="text-base font-extrabold text-red-500 flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Deudas Pendientes
                      </h3>
                      <div className="space-y-2">
                        {clientes.filter((c) => c.pago === 'Pendiente')
                          .length === 0 ? (
                          <p className="text-neutral-400 text-sm font-medium">
                            Todos al día 🎉
                          </p>
                        ) : (
                          clientes
                            .filter((c) => c.pago === 'Pendiente')
                            .map((cli) => (
                              <div
                                key={cli.id}
                                className="flex justify-between items-center py-3 border-b border-neutral-900 text-sm"
                              >
                                <span className="font-bold text-gray-200">
                                  {cli.nombre}
                                </span>
                                <a
                                  href={`https://wa.me/${cli.whatsapp}?text=Hola,%20tienes%20un%20pago%20pendiente.`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-red-400 bg-red-950/40 border border-red-900/50 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-red-900/40 transition"
                                >
                                  Cobrar
                                </a>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    <div className="p-7 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] space-y-4 shadow-xl">
                      <h3 className="text-base font-extrabold text-amber-500 flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Vencen próximos 3 días
                      </h3>
                      <div className="space-y-2">
                        {(() => {
                          const hoy = new Date();
                          const lim = new Date();
                          lim.setDate(hoy.getDate() + 3);
                          const porVencer = clientes.filter((cli) => {
                            const arr = cli.fin ? cli.fin.split('-') : [];
                            if (arr.length !== 3) return false;
                            const d = new Date(arr[0], arr[1] - 1, arr[2]);
                            return d >= hoy && d <= lim;
                          });

                          if (porVencer.length === 0)
                            return (
                              <p className="text-neutral-400 text-sm font-medium">
                                Sin vencimientos cercanos.
                              </p>
                            );
                          return porVencer.map((cli) => (
                            <div
                              key={cli.id}
                              className="flex justify-between py-3 border-b border-neutral-900 text-sm"
                            >
                              <span className="font-bold text-gray-200">
                                {cli.nombre}
                              </span>
                              <span className="text-amber-400 font-extrabold text-xs bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                {cli.fin}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA VENTAS RÁPIDAS */}
              {vista === 'ventas' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">
                      Cuentas Listas para Entregar
                    </h2>
                    <button
                      onClick={cargarDatos}
                      className="bg-[#141414] hover:bg-neutral-800 text-neutral-300 px-4 py-2.5 rounded-2xl text-sm transition border border-neutral-800 flex items-center gap-2 shadow-sm font-semibold"
                    >
                      <RefreshCw className="w-4 h-4" /> Actualizar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inventario.filter((i) => i.estado === 'Disponible')
                      .length === 0 ? (
                      <div className="col-span-full text-center py-16 text-neutral-400 p-8 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d]">
                        No hay stock disponible en este momento.
                      </div>
                    ) : (
                      inventario
                        .filter((i) => i.estado === 'Disponible')
                        .map((acc, idx) => {
                          const hoy = new Date();
                          if (hoy.getHours() >= 20)
                            hoy.setDate(hoy.getDate() + 1);
                          hoy.setMonth(hoy.getMonth() + 1);
                          const meses = [
                            'Ene',
                            'Feb',
                            'Mar',
                            'Abr',
                            'May',
                            'Jun',
                            'Jul',
                            'Ago',
                            'Sep',
                            'Oct',
                            'Nov',
                            'Dic',
                          ];
                          const fechaF =
                            ('0' + hoy.getDate()).slice(-2) +
                            meses[hoy.getMonth()];
                          const textoWP = `CCARG#N${idx + 1}( ${fechaF})\n${
                            acc.correo
                          }\n🔑 889900\nBOT TELEGRAM`;

                          return (
                            <div
                              key={acc.id}
                              className="p-6 rounded-3xl border border-[#2b0d0d] bg-gradient-to-b from-[#120707] to-[#080303] flex flex-col justify-between space-y-5 shadow-2xl"
                            >
                              <pre className="text-xs font-mono text-neutral-200 bg-[#050505] p-4 rounded-2xl whitespace-pre-wrap border border-neutral-900 shadow-inner">
                                {textoWP}
                              </pre>
                              <div className="flex justify-between items-center pt-3 border-t border-neutral-950">
                                <span className="text-xs font-extrabold text-red-500 bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-900/40">
                                  Stock #{idx + 1}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(textoWP);
                                    setCopiadoIdx(acc.id);
                                    setTimeout(() => setCopiadoIdx(null), 1500);
                                  }}
                                  className={`text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg ${
                                    copiadoIdx === acc.id
                                      ? 'bg-neutral-800'
                                      : 'bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 shadow-red-950'
                                  }`}
                                >
                                  {copiadoIdx === acc.id ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                  {copiadoIdx === acc.id ? 'Copiado' : 'Copiar'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* VISTA INVENTARIO */}
              {vista === 'inventario' && (
                <div className="rounded-3xl overflow-hidden animate-fade-in border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl">
                  <div className="p-5 border-b border-[#2b0d0d] flex flex-col md:flex-row justify-between items-center bg-[#140a0a] gap-4">
                    <div className="relative w-full md:w-1/3">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={busquedaInv}
                        onChange={(e) => setBusquedaInv(e.target.value)}
                        placeholder="Buscar correo o proveedor..."
                        className="w-full pl-11 pr-4 py-2.5 bg-[#050505] border border-neutral-800 rounded-xl text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <button
                        onClick={() =>
                          exportarACSV(inventario, 'inventario_aluria')
                        }
                        className="bg-[#141414] hover:bg-neutral-800 text-neutral-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-neutral-800 flex items-center gap-2 shadow-sm"
                      >
                        <Download className="w-4 h-4" /> Exportar CSV
                      </button>
                      <button
                        onClick={() => setModalInv(true)}
                        className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-red-950 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Importar Lote
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                        <tr>
                          <th className="px-6 py-4">Correo</th>
                          <th className="px-6 py-4">Proveedor</th>
                          <th className="px-6 py-4">Costo ($)</th>
                          <th className="px-6 py-4">Precio (S/)</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="px-6 py-4">Cliente Asignado</th>
                          <th className="px-6 py-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900">
                        {inventarioFiltrado.length === 0 ? (
                          <tr>
                            <td
                              colSpan="7"
                              className="text-center py-12 text-neutral-500 font-medium"
                            >
                              Sin resultados en inventario.
                            </td>
                          </tr>
                        ) : (
                          inventarioFiltrado.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-neutral-900/40 transition"
                            >
                              <td className="px-6 py-4 font-bold text-white">
                                {item.correo}
                              </td>
                              <td className="px-6 py-4 text-neutral-400">
                                {item.proveedor}
                              </td>
                              <td className="px-6 py-4 text-neutral-300 font-mono">
                                ${item.costo}
                              </td>
                              <td className="px-6 py-4 text-neutral-300 font-mono">
                                S/{item.precio}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    item.estado === 'Disponible'
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                  }`}
                                >
                                  {item.estado}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-neutral-400">
                                {item.cliente || '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() =>
                                    eliminarCuentaInv(item.id, item.correo)
                                  }
                                  className="p-2.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl transition border border-red-900/30 shadow-sm"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VISTA CLIENTES */}
              {vista === 'clientes' && (
                <div className="rounded-3xl overflow-hidden animate-fade-in border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl">
                  <div className="p-5 border-b border-[#2b0d0d] flex flex-col md:flex-row justify-between items-center bg-[#140a0a] gap-4">
                    <div className="relative w-full md:w-1/3">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={busquedaCli}
                        onChange={(e) => setBusquedaCli(e.target.value)}
                        placeholder="Buscar cliente..."
                        className="w-full pl-11 pr-4 py-2.5 bg-[#050505] border border-neutral-800 rounded-xl text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                      <button
                        onClick={() =>
                          exportarACSV(clientes, 'clientes_aluria')
                        }
                        className="bg-[#141414] hover:bg-neutral-800 text-neutral-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-neutral-800 flex items-center gap-2 shadow-sm"
                      >
                        <Download className="w-4 h-4" /> Exportar CSV
                      </button>
                      <button
                        onClick={() => setModoResumen(!modoResumen)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                          modoResumen
                            ? 'bg-red-900 text-white border border-red-700'
                            : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />{' '}
                        {modoResumen
                          ? 'Ver Directorio Normal'
                          : 'Ver Resumen LTV'}
                      </button>
                      <button
                        onClick={() => setModalCli(true)}
                        className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-red-950 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Asignar / Nuevo
                      </button>
                    </div>
                  </div>

                  {!modoResumen ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                          <tr>
                            <th className="px-6 py-4">Nombre / WhatsApp</th>
                            <th className="px-6 py-4">Cuenta Actual</th>
                            <th className="px-6 py-4">Vence</th>
                            <th className="px-6 py-4">Pago</th>
                            <th className="px-6 py-4 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                          {clientesFiltrados.length === 0 ? (
                            <tr>
                              <td
                                colSpan="5"
                                className="text-center py-12 text-neutral-500 font-medium"
                              >
                                Sin resultados
                              </td>
                            </tr>
                          ) : (
                            clientesFiltrados.map((c) => (
                              <tr
                                key={c.id}
                                className="hover:bg-neutral-900/40 transition"
                              >
                                <td className="px-6 py-4 font-bold text-white">
                                  {c.nombre}
                                  <span className="block text-xs text-neutral-400 font-normal">
                                    {c.whatsapp}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-red-400">
                                  {c.cuenta}
                                </td>
                                <td className="px-6 py-4 text-neutral-200 font-semibold">
                                  {c.fin}
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                                      c.pago === 'Pendiente'
                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                    }`}
                                  >
                                    {c.pago}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() =>
                                      eliminarClienteYLiberar(c.id, c.cuenta)
                                    }
                                    className="p-2.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl transition border border-red-900/30 shadow-sm"
                                    title="Eliminar y Liberar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                          <tr>
                            <th className="px-6 py-4">Top Clientes</th>
                            <th className="px-6 py-4 text-center">
                              Cuentas Activas
                            </th>
                            <th className="px-6 py-4 text-center">
                              Aporte Mensual (S/)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                          {(() => {
                            let ltv = {};
                            clientes.forEach((cli) => {
                              if (!ltv[cli.whatsapp])
                                ltv[cli.whatsapp] = {
                                  nom: cli.nombre,
                                  w: cli.whatsapp,
                                  numCuentas: 0,
                                  aporte: 0,
                                };
                              ltv[cli.whatsapp].numCuentas++;
                              const correoBase = cli.cuenta
                                ? cli.cuenta.split(' (')[0].trim()
                                : '';
                              const invMatch = inventario.find(
                                (it) =>
                                  it.correo.trim().toLowerCase() ===
                                  correoBase.toLowerCase()
                              );
                              if (invMatch)
                                ltv[cli.whatsapp].aporte +=
                                  parseFloat(invMatch.precio) || 0;
                            });
                            const top = Object.values(ltv).sort(
                              (a, b) => b.aporte - a.aporte
                            );
                            if (top.length === 0)
                              return (
                                <tr>
                                  <td
                                    colSpan="3"
                                    className="text-center py-12 text-neutral-500 font-medium"
                                  >
                                    Sin datos para LTV
                                  </td>
                                </tr>
                              );
                            return top.map((t, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-neutral-900/40 transition"
                              >
                                <td className="px-6 py-4 font-bold text-white">
                                  {idx === 0
                                    ? '🥇'
                                    : idx === 1
                                    ? '🥈'
                                    : idx === 2
                                    ? '🥉'
                                    : `#${idx + 1}`}{' '}
                                  {t.nom}{' '}
                                  <span className="block text-xs text-neutral-400 font-normal">
                                    {t.w}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center font-extrabold text-red-400 text-base">
                                  {t.numCuentas}
                                </td>
                                <td className="px-6 py-4 text-center font-extrabold text-white text-base">
                                  S/ {t.aporte.toFixed(2)}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA GESTIÓN DE CUENTAS */}
              {vista === 'gestion' && (
                <div className="rounded-3xl overflow-hidden animate-fade-in border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl">
                  <div className="p-5 border-b border-[#2b0d0d] flex flex-wrap justify-between items-center bg-[#140a0a] gap-4">
                    <div className="relative w-full md:w-1/3">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={busquedaGestion}
                        onChange={(e) => setBusquedaGestion(e.target.value)}
                        placeholder="Buscar por correo o proveedor..."
                        className="w-full pl-11 pr-4 py-2.5 bg-[#050505] border border-neutral-800 rounded-xl text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                      />
                    </div>
                    <span className="text-xs font-semibold text-neutral-400 bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-800">
                      Total registros en stock masivo:{' '}
                      <strong className="text-white">
                        {inventario.length}
                      </strong>{' '}
                      cuentas
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                        <tr>
                          <th className="px-6 py-4">Correo Cuenta</th>
                          <th className="px-6 py-4">Proveedor</th>
                          <th className="px-6 py-4">Costo ($)</th>
                          <th className="px-6 py-4">Estado Proveedor</th>
                          <th className="px-6 py-4 text-center">
                            Acciones Contables
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900">
                        {inventarioGestion.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="text-center py-12 text-neutral-500 font-medium"
                            >
                              Sin cuentas registradas en el sistema.
                            </td>
                          </tr>
                        ) : (
                          inventarioGestion.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-neutral-900/40 transition"
                            >
                              <td className="px-6 py-4 font-bold text-white">
                                {item.correo}
                              </td>
                              <td className="px-6 py-4 text-neutral-400">
                                {item.proveedor}
                              </td>
                              <td className="px-6 py-4 text-neutral-300 font-mono">
                                ${item.costo}
                              </td>
                              <td className="px-6 py-4">
                                {item.proveedor_pagado ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                                    Pagado a Proveedor
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                    Pendiente Proveedor
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center space-x-3">
                                {!item.proveedor_pagado && (
                                  <button
                                    onClick={() =>
                                      marcarPagadoProveedor(item.id)
                                    }
                                    className="px-4 py-2 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-950"
                                  >
                                    Resaltar Pagada
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    sacarDelStock(item.id, item.correo)
                                  }
                                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-neutral-700 rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                  No será renovada (Salir de Stock)
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VISTA CONTROL DE GASTOS */}
              {vista === 'gastos' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-6 rounded-3xl border-t-4 border-t-amber-500 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">
                        Comida
                      </h3>
                      <p className="text-3xl font-extrabold text-amber-400">
                        S/ {gastosComida.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-6 rounded-3xl border-t-4 border-t-red-600 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">
                        Pasajes
                      </h3>
                      <p className="text-3xl font-extrabold text-red-400">
                        S/ {gastosPasajes.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-6 rounded-3xl border-t-4 border-t-purple-500 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">
                        Detalles
                      </h3>
                      <p className="text-3xl font-extrabold text-purple-400">
                        S/ {gastosDetalles.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-6 rounded-3xl border-t-4 border-t-neutral-400 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">
                        Otros
                      </h3>
                      <p className="text-3xl font-extrabold text-neutral-200">
                        S/ {gastosOtros.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl overflow-hidden border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl">
                    <div className="p-5 border-b border-[#2b0d0d] flex justify-between items-center bg-[#140a0a]">
                      <h3 className="font-bold text-white text-base">
                        Historial de Transacciones y Gastos Acumulados
                      </h3>
                      <button
                        onClick={() => setModalCaja(true)}
                        className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-red-950 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Registrar Nuevo Gasto
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                          <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Concepto / Categoría</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4 text-right">Monto (S/)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                          {pagos.length === 0 ? (
                            <tr>
                              <td
                                colSpan="4"
                                className="text-center py-12 text-neutral-500 font-medium"
                              >
                                No hay gastos ni ingresos extras registrados.
                              </td>
                            </tr>
                          ) : (
                            pagos.map((p) => (
                              <tr
                                key={p.id}
                                className="hover:bg-neutral-900/40 transition"
                              >
                                <td className="px-6 py-4 text-neutral-400 font-mono">
                                  {p.fecha}
                                </td>
                                <td className="px-6 py-4 font-bold text-white">
                                  {p.concepto}
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      p.tipo === 'Ingreso'
                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                    }`}
                                  >
                                    {p.tipo}
                                  </span>
                                </td>
                                <td
                                  className={`px-6 py-4 text-right font-extrabold font-mono text-base ${
                                    p.tipo === 'Ingreso'
                                      ? 'text-red-500'
                                      : 'text-neutral-200'
                                  }`}
                                >
                                  {p.tipo === 'Ingreso' ? '+' : '-'} S/{' '}
                                  {parseFloat(p.monto).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODAL IMPORTAR INVENTARIO (LOTE) */}
      {modalInv && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] border border-[#3b0909] rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl shadow-red-950">
            <div className="flex justify-between items-center border-b border-[#2b0d0d] pb-4">
              <h3 className="text-xl font-extrabold text-white">
                Importar Inventario Lote
              </h3>
              <button
                onClick={() => setModalInv(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={procesarPegaInventario} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                  Proveedor
                </label>
                <input
                  type="text"
                  required
                  value={loteProv}
                  onChange={(e) => setLoteProv(e.target.value)}
                  placeholder="Nombre del proveedor"
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                    Costo USDT
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loteCosto}
                    onChange={(e) => setLoteCosto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                    Precio Soles
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={lotePrecio}
                    onChange={(e) => setLotePrecio(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                  Lista de Correos
                </label>
                <textarea
                  rows="6"
                  required
                  value={loteCorreos}
                  onChange={(e) => setLoteCorreos(e.target.value)}
                  placeholder="Pega los correos aquí... (uno por línea)"
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-mono resize-none focus:ring-2 focus:ring-red-600 shadow-inner"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button
                  type="button"
                  onClick={() => setModalInv(false)}
                  className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950"
                >
                  Guardar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR CLIENTE */}
      {modalCli && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] border border-[#3b0909] rounded-3xl w-full max-w-md p-8 space-y-5 shadow-2xl shadow-red-950">
            <div className="flex justify-between items-center border-b border-[#2b0d0d] pb-4">
              <h3 className="text-xl font-extrabold text-white">
                Asignar Cuenta a Cliente
              </h3>
              <button
                onClick={() => setModalCli(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={guardarClienteNuevo} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  value={cliNom}
                  onChange={(e) => setCliNom(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={cliNum}
                  onChange={(e) => setCliNum(e.target.value)}
                  placeholder="Ej. 987654321"
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  Cuenta Disponible en Stock:
                </label>
                <select
                  required
                  value={cliCuentaAsignada}
                  onChange={(e) => setCliCuentaAsignada(e.target.value)}
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                >
                  <option value="">-- Selecciona una cuenta --</option>
                  {inventario
                    .filter((i) => i.estado === 'Disponible')
                    .map((item) => (
                      <option key={item.id} value={item.correo}>
                        {item.correo} ({item.proveedor})
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={cliInicio}
                    onChange={(e) => setCliInicio(e.target.value)}
                    className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={cliFin}
                    onChange={(e) => setCliFin(e.target.value)}
                    className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  Estado de Pago
                </label>
                <select
                  value={cliPago}
                  onChange={(e) => setCliPago(e.target.value)}
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-bold focus:ring-2 focus:ring-red-600 shadow-inner"
                >
                  <option value="Pagado">✅ Pagado</option>
                  <option value="Pendiente">❌ Pendiente</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button
                  type="button"
                  onClick={() => setModalCli(false)}
                  className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950"
                >
                  Asignar con Éxito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONTROL DE GASTOS */}
      {modalCaja && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] border border-[#3b0909] rounded-3xl w-full max-w-md p-8 space-y-5 shadow-2xl shadow-red-950">
            <div className="flex justify-between items-center border-b border-[#2b0d0d] pb-4">
              <h3 className="text-xl font-extrabold text-white">
                Control de Gastos
              </h3>
              <button
                onClick={() => setModalCaja(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={guardarTransaccion} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  Categoría del Gasto
                </label>
                <select
                  value={gastoCategoria}
                  onChange={(e) => setGastoCategoria(e.target.value)}
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-bold focus:ring-2 focus:ring-red-600 shadow-inner"
                >
                  <option value="Comida">🍔 Comida</option>
                  <option value="Pasajes">🚗 Pasajes</option>
                  <option value="Detalles">🎁 Detalles</option>
                  <option value="Otros">📦 Otros</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  Concepto o Detalle
                </label>
                <input
                  type="text"
                  required
                  value={gastoConcepto}
                  onChange={(e) => setGastoConcepto(e.target.value)}
                  placeholder="Ej. Almuerzo con equipo"
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  Monto (Soles)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                  Tipo de Transacción
                </label>
                <select
                  value={gastoTipo}
                  onChange={(e) => setGastoTipo(e.target.value)}
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-bold focus:ring-2 focus:ring-red-600 shadow-inner"
                >
                  <option value="Egreso">🔻 Egreso (Gasto)</option>
                  <option value="Ingreso">🔺 Ingreso Extra</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button
                  type="button"
                  onClick={() => setModalCaja(false)}
                  className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para botones del menú en Computadora
function BotonesMenu({ icono, texto, vista, vistaActual, setVista }) {
  const activo = vistaActual === vista;
  return (
    <button
      onClick={() => setVista(vista)}
      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 ${
        activo
          ? 'bg-gradient-to-r from-[#800f11] to-red-600 text-white shadow-lg shadow-red-950 font-bold'
          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 font-medium'
      }`}
    >
      {icono}
      <span className="text-sm tracking-wide">{texto}</span>
    </button>
  );
}

// Componente para los botones de la barra inferior en Celulares
function BotonMobile({ icono, texto, vista, vistaActual, setVista }) {
  const activo = vistaActual === vista;
  return (
    <button
      onClick={() => setVista(vista)}
      className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
        activo
          ? 'text-red-500 font-bold scale-105'
          : 'text-neutral-400 hover:text-neutral-200 font-medium'
      }`}
    >
      {icono}
      <span className="text-[10px] tracking-tight mt-1">{texto}</span>
    </button>
  );
}