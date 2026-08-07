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
  Upload,
  UserPlus,
  UserMinus,
  CalendarDays,
  Edit,
  Calculator,
  FileText
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [emailLogin, setEmailLogin] = useState('');
  const [passLogin, setPassLogin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- MEMORIA PARA RECORDAR LA ÚLTIMA PESTAÑA ABIERTA ---
  const [vista, setVista] = useState(() => {
    return localStorage.getItem('vista_aluria') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('vista_aluria', vista);
  }, [vista]);

  const [inventario, setInventario] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // --- ESTADO PARA ELIMINACIÓN MASIVA ---
  const [seleccionadosInv, setSeleccionadosInv] = useState([]);

  // --- ESTADOS PARA REEMBOLSOS (INDIVIDUAL Y MASIVO) ---
  const [subVistaReembolso, setSubVistaReembolso] = useState('calculadora'); // 'calculadora' | 'masivo'

  // Individual
  const [reembolsoCorreo, setReembolsoCorreo] = useState('');
  const [reembolsoMoneda, setReembolsoMoneda] = useState('Bs');
  const [reembolsoMonto, setReembolsoMonto] = useState('35');
  const [reembolsoInicio, setReembolsoInicio] = useState('');
  // Falla auto-completada con hoy
  const [reembolsoFalla, setReembolsoFalla] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().split('T')[0];
  });
  const [reembolsoDuracion, setReembolsoDuracion] = useState(30);
  const [resultadoReembolso, setResultadoReembolso] = useState(null);

  // Masivo
  const [masivoTexto, setMasivoTexto] = useState('');
  const [masivoFalla, setMasivoFalla] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().split('T')[0];
  });
  const [masivoDuracion, setMasivoDuracion] = useState(30);
  const [masivoNotas, setMasivoNotas] = useState(() => localStorage.getItem('alu_notasReembolso') || '');

  useEffect(() => {
    localStorage.setItem('alu_notasReembolso', masivoNotas);
  }, [masivoNotas]);

  // --- NOTIFICACIONES FLOTANTES ---
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' });

  function mostrarNotificacion(mensaje, tipo = 'success') {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion({ visible: false, mensaje: '', tipo: 'success' });
    }, 3000);
  }

  const [tc, setTc] = useState(() => {
    return localStorage.getItem('tc_aluria') || '3.42';
  });

  useEffect(() => {
    localStorage.setItem('tc_aluria', tc);
  }, [tc]);

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

  useEffect(() => {
    if (!session) return;
    
    cargarDatos(true); 

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        cargarDatos(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // =====================================================================
  // 🔥 ACTUALIZACIÓN SILENCIOSA 🔥
  // =====================================================================
  async function cargarDatos(silencioso = true) {
    try {
      if (!silencioso) setCargando(true);
      
      const { data: inv, error: errInv } = await supabase.from('inventario').select('*');
      const { data: cli, error: errCli } = await supabase.from('clientes').select('*');
      const { data: pag, error: errPag } = await supabase.from('pagos').select('*');

      if (errInv) throw errInv;
      if (errCli) throw errCli;
      if (errPag) throw errPag;

      if (inv) {
        const invOrdenado = inv.sort((a, b) => a.id - b.id);
        setInventario(invOrdenado);
      }
      if (cli) setClientes(cli);
      if (pag) setPagos(pag);

    } catch (error) {
      console.error('Error al sincronizar con Supabase', error);
      mostrarNotificacion('Error cargando datos: ' + error.message, 'error');
      if (error.message && error.message.includes('JWT')) {
        handleLogout();
      }
    } finally {
      setCargando(false);
    }
  }

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
      mostrarNotificacion('Error de autenticación: Verifica tu correo o contraseña.', 'error');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setInventario([]);
    setClientes([]);
    setPagos([]);
  }

  function exportarACSV(data, filename) {
    if (!data || data.length === 0) return mostrarNotificacion('No hay datos para exportar', 'error');
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

  // =====================================================================
  // MEMORIA INMORTAL DE MODALES
  // =====================================================================
  const [modalCli, setModalCli] = useState(() => localStorage.getItem('alu_modalCli') === 'true');
  const [cliNom, setCliNom] = useState(() => localStorage.getItem('alu_cliNom') || '');
  const [cliNum, setCliNum] = useState(() => localStorage.getItem('alu_cliNum') || '');
  const [cliCuentaAsignada, setCliCuentaAsignada] = useState(() => localStorage.getItem('alu_cliCuentas') || '');
  const [cliInicio, setCliInicio] = useState(() => localStorage.getItem('alu_cliInicio') || '');
  const [cliFin, setCliFin] = useState(() => localStorage.getItem('alu_cliFin') || '');
  const [cliPago, setCliPago] = useState(() => localStorage.getItem('alu_cliPago') || 'Pagado');

  const [modalReemplazo, setModalReemplazo] = useState(() => localStorage.getItem('alu_modalReemplazo') === 'true');
  const [textoReemplazo, setTextoReemplazo] = useState(() => localStorage.getItem('alu_textoReemplazo') || '');

  const [modalEditarCli, setModalEditarCli] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  useEffect(() => {
    localStorage.setItem('alu_modalCli', modalCli);
    localStorage.setItem('alu_cliNom', cliNom);
    localStorage.setItem('alu_cliNum', cliNum);
    localStorage.setItem('alu_cliCuentas', cliCuentaAsignada);
    localStorage.setItem('alu_cliInicio', cliInicio);
    localStorage.setItem('alu_cliFin', cliFin);
    localStorage.setItem('alu_cliPago', cliPago);
  }, [modalCli, cliNom, cliNum, cliCuentaAsignada, cliInicio, cliFin, cliPago]);

  useEffect(() => {
    localStorage.setItem('alu_modalReemplazo', modalReemplazo);
    localStorage.setItem('alu_textoReemplazo', textoReemplazo);
  }, [modalReemplazo, textoReemplazo]);

  function cerrarModalCli() {
    setModalCli(false);
    setCliNom('');
    setCliNum('');
    setCliCuentaAsignada('');
    setCliInicio('');
    setCliFin('');
    setCliPago('Pagado');
  }

  function cerrarModalReemplazo() {
    setModalReemplazo(false);
    setTextoReemplazo('');
  }

  function abrirEditarCliente(cli) {
    setClienteEditando(cli);
    setCliNom(cli.nombre);
    setCliNum(cli.whatsapp);
    setCliInicio(cli.inicio || '');
    setCliFin(cli.fin || '');
    setModalEditarCli(true);
  }

  async function guardarEdicionCliente(e) {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ nombre: cliNom, whatsapp: cliNum, inicio: cliInicio, fin: cliFin })
        .eq('id', clienteEditando.id);
      
      if (error) throw error;
      
      mostrarNotificacion('Datos actualizados con éxito', 'success');
      setModalEditarCli(false);
      setClienteEditando(null);
      cerrarModalCli(); 
      cargarDatos(true); 
    } catch (error) {
      mostrarNotificacion('Error al editar: ' + error.message, 'error');
    }
  }

  const [modalInv, setModalInv] = useState(false);
  const [modalCaja, setModalCaja] = useState(false);

  const [busquedaInv, setBusquedaInv] = useState('');
  const [busquedaCli, setBusquedaCli] = useState('');
  const [busquedaGestion, setBusquedaGestion] = useState('');
  const [modoResumen, setModoResumen] = useState(false);

  const [loteProv, setLoteProv] = useState('');
  const [loteCosto, setLoteCosto] = useState('');
  const [lotePrecio, setLotePrecio] = useState('');
  const [loteCorreos, setLoteCorreos] = useState('');

  const [gastoCategoria, setGastoCategoria] = useState('Comida');
  const [gastoConcepto, setGastoConcepto] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoTipo, setGastoTipo] = useState('Egreso');

  const [copiadoIdx, setCopiadoIdx] = useState(null);

  const clientesUnicos = [];
  const mapClientes = new Map();
  clientes.forEach(c => {
    if (!mapClientes.has(c.whatsapp)) {
      mapClientes.set(c.whatsapp, true);
      clientesUnicos.push({ nombre: c.nombre, whatsapp: c.whatsapp });
    }
  });
  clientesUnicos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  function agruparPorWhatsapp(lista) {
    const map = {};
    lista.forEach(c => {
      if (!map[c.whatsapp]) map[c.whatsapp] = { nombre: c.nombre, whatsapp: c.whatsapp, cuentas: [] };
      map[c.whatsapp].cuentas.push(c);
    });
    return Object.values(map);
  }

  // =====================================================================
  // 🔥 LÓGICA DE REEMBOLSOS (INDIVIDUAL Y MASIVO) 🔥
  // =====================================================================
  function calcularReembolso(e) {
    e.preventDefault();
    if (!reembolsoInicio || !reembolsoFalla || !reembolsoMonto) {
      mostrarNotificacion('Faltan datos para calcular', 'error');
      return;
    }

    const dInicio = new Date(reembolsoInicio);
    const dFalla = new Date(reembolsoFalla);
    const diffTime = dFalla - dInicio;
    
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const diasUsados = diffDays >= 0 ? diffDays + 1 : 0; 

    if (diasUsados < 0 || diasUsados > reembolsoDuracion) {
      mostrarNotificacion('Rango de fechas inválido o excede duración del plan', 'error');
      return;
    }

    const diasSinUsar = reembolsoDuracion - diasUsados;
    const valorPorDia = parseFloat(reembolsoMonto) / reembolsoDuracion;
    const consumido = valorPorDia * diasUsados;
    const aDevolver = valorPorDia * diasSinUsar;

    const formatoFecha = (dateStr) => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    setResultadoReembolso({
      diasUsados,
      diasSinUsar,
      valorPorDia,
      consumido,
      aDevolver,
      montoS: parseFloat(reembolsoMonto),
      duracion: reembolsoDuracion,
      inicio: formatoFecha(reembolsoInicio),
      falla: formatoFecha(reembolsoFalla),
      moneda: reembolsoMoneda,
      correo: reembolsoCorreo || 'No especificado'
    });
  }

  function copiarComprobanteReembolso() {
    if (!resultadoReembolso) return;
    const r = resultadoReembolso;
    const txt = `*COMPROBANTE DE REEMBOLSO*\nCorreo: ${r.correo}\nMonto a devolver: ${r.moneda} ${r.aDevolver.toFixed(2)}\n\nDetalles:\n- Monto pagado: ${r.moneda} ${r.montoS.toFixed(2)} por ${r.duracion} días\n- Días usados: ${r.diasUsados}\n- Días sin usar: ${r.diasSinUsar}\n\nCálculo de devolución:\n${r.moneda} ${r.montoS.toFixed(2)} ÷ ${r.duracion} = ${r.moneda} ${r.valorPorDia.toFixed(2)} por día × ${r.diasSinUsar} días sin usar = ${r.moneda} ${r.aDevolver.toFixed(2)}`;
    navigator.clipboard.writeText(txt);
    mostrarNotificacion('Comprobante copiado al portapapeles', 'success');
  }

  async function desasignarDesdeReembolso() {
    if (!resultadoReembolso || !resultadoReembolso.correo || resultadoReembolso.correo === 'No especificado') {
      mostrarNotificacion('Debe ingresar un correo válido en el formulario', 'error');
      return;
    }
    
    const invMatch = inventario.find(i => (i.correo || '').toLowerCase().trim() === resultadoReembolso.correo.toLowerCase().trim());
    
    if (!invMatch) {
      mostrarNotificacion('Este correo no se encuentra registrado en el inventario actual', 'error');
      return;
    }

    if (invMatch.estado === 'Disponible') {
      mostrarNotificacion('Esta cuenta ya figura como Disponible (Desasignada)', 'success');
      return;
    }

    await desasignarCuentaUnica(invMatch);
  }

  // Lógica de Reembolso Masivo (Borra y genera notas)
  async function procesarReembolsoMasivo(e) {
    e.preventDefault();
    const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const correos = masivoTexto.match(regexCorreos) || [];

    if (correos.length === 0) {
      return mostrarNotificacion('No se detectaron correos válidos en el texto', 'error');
    }

    if (!confirm(`¿Estás seguro de eliminar PERMANENTEMENTE y calcular el reembolso de ${correos.length} cuentas?`)) return;

    setCargando(true);
    let nuevasNotas = `\n--- LOTE DE REEMBOLSOS (${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}) ---\n`;
    let idsInvAEliminar = [];

    try {
      for (let c of correos) {
        const correoLimpio = c.toLowerCase().trim();
        const invMatch = inventario.find(i => (i.correo || '').toLowerCase().trim() === correoLimpio);

        if (invMatch) {
          idsInvAEliminar.push(invMatch.id); // Se preparan para eliminación total del inventario

          if (invMatch.estado === 'Asignada') {
            const cliMatch = clientes.find(cli => (cli.cuenta || '').toLowerCase().includes(correoLimpio));
            
            if (cliMatch) {
              const monto = parseFloat(invMatch.precio_venta) > 0 ? parseFloat(invMatch.precio_venta) : 35;
              const dInicio = new Date(cliMatch.inicio || new Date());
              const dFalla = new Date(masivoFalla);
              const diffTime = dFalla - dInicio;
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              const diasUsados = diffDays >= 0 ? diffDays + 1 : 0;
              const diasSinUsar = Math.max(0, masivoDuracion - diasUsados);
              const aDevolver = (monto / masivoDuracion) * diasSinUsar;

              nuevasNotas += `✅ Cliente: ${cliMatch.nombre}\n   ✉️ ${correoLimpio}\n   💰 Reembolso: S/ ${aDevolver.toFixed(2)} (Faltaban ${diasSinUsar} días de ${masivoDuracion})\n\n`;

              // Actualizamos la cadena "cuenta" del cliente, si se queda vacío, borramos el cliente entero.
              const regexStr = new RegExp(`${correoLimpio}[^,]*`, 'gi');
              let nuevaCuenta = cliMatch.cuenta.replace(regexStr, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
              
              if (nuevaCuenta === '') {
                await supabase.from('clientes').delete().eq('id', cliMatch.id);
              } else {
                await supabase.from('clientes').update({ cuenta: nuevaCuenta }).eq('id', cliMatch.id);
              }
            } else {
              nuevasNotas += `⚠️ ✉️ ${correoLimpio} (Asignado en stock pero sin cliente en DB. Fue eliminado)\n\n`;
            }
          } else {
            nuevasNotas += `🗑️ ✉️ ${correoLimpio} (Estaba libre en stock. Eliminado sin reembolso)\n\n`;
          }
        } else {
          nuevasNotas += `❌ ✉️ ${correoLimpio} (No encontrado en la base de datos)\n\n`;
        }
      }

      // Ejecutar borrado masivo de Supabase
      if (idsInvAEliminar.length > 0) {
        for (let i = 0; i < idsInvAEliminar.length; i += 100) {
          const batch = idsInvAEliminar.slice(i, i + 100);
          const { error } = await supabase.from('inventario').delete().in('id', batch);
          if (error) throw error;
        }
      }

      setMasivoNotas(prev => (prev + nuevasNotas).trim());
      setMasivoTexto('');
      mostrarNotificacion(`Proceso completado. ${idsInvAEliminar.length} eliminadas.`, 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error en proceso masivo: ' + error.message, 'error');
    } finally {
      setCargando(false);
    }
  }


  // =====================================================================
  // 🔥 TEXTOS DE COBRO ESTÉTICOS Y WHATSAPP 🔥
  // =====================================================================
  const generarTextoCobro = (grupo) => {
    const correosStr = grupo.cuentas.map(c => `▪️ ${c.cuenta.split(' (')[0].trim()}`).join('\n');
    const montoTotal = grupo.cuentas.length * 35;
    
    return `👋 Hola *${grupo.nombre}*, ¿cómo estás?\n\nTienes un pago pendiente de renovación:\n\n${correosStr}\n\n💰 *Total: S/ ${montoTotal.toFixed(2)}*\n\n🔥 *Datos para pagar:* 🔥\n👤 Titular: Ruben Ich\n💜 Yape: 931 111 443\n💳 ID Binance: 1179968495\n\nMe confirmas cuando realices el pago porfas, ¡Gracias! ✨`;
  };

  const generarLinkWp = (grupo) => {
    const texto = generarTextoCobro(grupo);
    const numLimpio = grupo.whatsapp.replace(/\D/g, ''); 
    return `https://wa.me/${numLimpio}?text=${encodeURIComponent(texto)}`;
  };

  const copiarTextoWp = (grupo) => {
    navigator.clipboard.writeText(generarTextoCobro(grupo));
    mostrarNotificacion('Mensaje de cobro copiado al portapapeles', 'success');
  };

  async function renovarCobranzaGrupo(cuentas) {
    try {
      for (let c of cuentas) {
        const arr = c.fin ? c.fin.split('-') : [];
        let d = arr.length === 3 ? new Date(arr[0], arr[1] - 1, arr[2]) : new Date();
        d.setDate(d.getDate() + 30);
        const nuevaFecha = d.toISOString().split('T')[0];
        
        await supabase.from('clientes').update({ fin: nuevaFecha, pago: 'Pagado' }).eq('id', c.id);
      }
      mostrarNotificacion(`Cuentas renovadas exitosamente`, 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al renovar: ' + error.message, 'error');
    }
  }

  async function marcarComoPagadoGrupo(cuentas) {
    try {
      const ids = cuentas.map(c => c.id);
      const { error } = await supabase.from('clientes').update({ pago: 'Pagado' }).in('id', ids);
      if (error) throw error;
      mostrarNotificacion(`¡Deuda saldada! (${cuentas.length} cuentas pagadas)`, 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al actualizar pago: ' + error.message, 'error');
    }
  }

  async function cancelarRenovacionGrupo(cuentas, nombreCli) {
    if (!confirm(`¿Estás seguro de que ${nombreCli} NO RENOVÓ?\nLas ${cuentas.length} cuenta(s) volverán al stock disponible.`)) return;

    setCargando(true);
    try {
      const idsClientes = cuentas.map(c => c.id);

      for (let c of cuentas) {
        const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const correos = c.cuenta.match(regexCorreos) || [];
        
        for(let correo of correos) {
          const invMatch = inventario.find(i => (i.correo || '').toLowerCase().trim() === correo.toLowerCase().trim());
          if (invMatch) {
            await supabase.from('inventario').update({ estado: 'Disponible', cliente_asignado: null }).eq('id', invMatch.id);
          }
        }
      }

      const { error } = await supabase.from('clientes').delete().in('id', idsClientes);
      if (error) throw error;

      mostrarNotificacion(`Cuentas de ${nombreCli} liberadas al stock con éxito.`, 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al liberar cuentas: ' + error.message, 'error');
      setCargando(false);
    }
  }

  async function cancelarRenovacionCliente(cliente) {
    if (!confirm(`¿Estás seguro de que ${cliente.nombre} NO RENOVÓ?\nSus cuentas volverán al stock y se eliminará el registro.`)) return;
    try {
      const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const correos = cliente.cuenta.match(regexCorreos) || [];
      for(let correo of correos) {
        const invMatch = inventario.find(i => (i.correo || '').toLowerCase().trim() === correo.toLowerCase().trim());
        if (invMatch) {
          await supabase.from('inventario').update({ estado: 'Disponible', cliente_asignado: null }).eq('id', invMatch.id);
        }
      }
      const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
      if (error) throw error;
      
      mostrarNotificacion(`Cuenta de ${cliente.nombre} liberada con éxito.`, 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al liberar cuenta: ' + error.message, 'error');
    }
  }

  async function desasignarCuentaUnica(item) {
    if (!confirm(`¿Estás seguro de DESASIGNAR la cuenta ${item.correo}?\nVolverá a estar "Disponible" en tu stock.`)) return;
    try {
      await supabase.from('inventario').update({ estado: 'Disponible', cliente_asignado: null }).eq('id', item.id);
      const cliMatch = clientes.find(c => (c.cuenta || '').toLowerCase().includes(item.correo.toLowerCase()));
      if (cliMatch) {
        const regex = new RegExp(`${item.correo}[^,]*`, 'gi');
        let nuevaCuenta = cliMatch.cuenta.replace(regex, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
        if (nuevaCuenta === '') {
          await supabase.from('clientes').delete().eq('id', cliMatch.id);
        } else {
          await supabase.from('clientes').update({ cuenta: nuevaCuenta }).eq('id', cliMatch.id);
        }
      }
      mostrarNotificacion('Cuenta desasignada correctamente y vuelta al stock', 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al desasignar: ' + error.message, 'error');
    }
  }

  async function eliminarClienteYLiberar(idCli, cuentaStr) {
    if (!confirm('¿Seguro que deseas eliminar este cliente permanentemente? Sus cuentas asignadas volverán al stock disponible.')) return;
    setCargando(true);
    try {
      const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const correos = cuentaStr.match(regexCorreos) || [];
      for (let correo of correos) {
        const invMatch = inventario.find(i => (i.correo || '').toLowerCase().trim() === correo.toLowerCase().trim());
        if (invMatch) {
          await supabase.from('inventario').update({ estado: 'Disponible', cliente_asignado: null }).eq('id', invMatch.id);
        }
      }
      const { error } = await supabase.from('clientes').delete().eq('id', idCli);
      if (error) throw error;
      mostrarNotificacion('Cliente eliminado y cuentas liberadas con éxito', 'success');
      cargarDatos(true);
    } catch (err) {
      mostrarNotificacion('Error al eliminar cliente: ' + err.message, 'error');
    } finally {
      setCargando(false);
    }
  }

  async function procesarReemplazos(e) {
    e.preventDefault();
    const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const correosEncontrados = textoReemplazo.match(regexCorreos) || [];

    if (correosEncontrados.length === 0 || correosEncontrados.length % 2 !== 0) {
      return mostrarNotificacion('Error: El formato debe contener pares exactos de correos (Antiguo y Nuevo).', 'error');
    }

    setCargando(true);
    try {
      let reemplazados = 0;
      let noEncontrados = 0;

      for (let i = 0; i < correosEncontrados.length; i += 2) {
        const cAntiguo = correosEncontrados[i].toLowerCase().trim();
        const cNuevo = correosEncontrados[i + 1].toLowerCase().trim();

        const itemInv = inventario.find(inv => (inv.correo || '').toLowerCase().trim() === cAntiguo);

        if (itemInv) {
          await supabase.from('inventario').update({ correo: cNuevo }).eq('id', itemInv.id);

          if (itemInv.estado === 'Asignada') {
            const cliMatch = clientes.find(c => (c.cuenta || '').toLowerCase().includes(cAntiguo));
            if (cliMatch) {
              const nuevaCuentaStr = cliMatch.cuenta.replace(new RegExp(cAntiguo, 'i'), cNuevo);
              await supabase.from('clientes').update({ cuenta: nuevaCuentaStr }).eq('id', cliMatch.id);
            }
          }
          reemplazados++;
        } else {
          noEncontrados++;
        }
      }

      mostrarNotificacion(`✅ ${reemplazados} reemplazos listos. ${noEncontrados > 0 ? `⚠️ ${noEncontrados} no encontrados en sistema.` : ''}`, 'success');
      cerrarModalReemplazo(); 
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al procesar reemplazos: ' + error.message, 'error');
    } finally {
      setCargando(false);
    }
  }

  // =====================================================================
  // 🔥 LÓGICA ELIMINACIÓN MASIVA 🔥
  // =====================================================================
  function toggleSeleccionInv(id) {
    setSeleccionadosInv(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSeleccionTodos(filtrados) {
    if (seleccionadosInv.length === filtrados.length && filtrados.length > 0) {
      setSeleccionadosInv([]);
    } else {
      setSeleccionadosInv(filtrados.map(i => i.id));
    }
  }

  async function eliminarSeleccionados() {
    if (!confirm(`¿Estás seguro de eliminar PERMANENTEMENTE ${seleccionadosInv.length} cuentas del inventario?`)) return;
    setCargando(true);
    try {
      for (let i = 0; i < seleccionadosInv.length; i += 100) {
        const batch = seleccionadosInv.slice(i, i + 100);
        const { error } = await supabase.from('inventario').delete().in('id', batch);
        if (error) throw error;
      }
      mostrarNotificacion(`Se eliminaron ${seleccionadosInv.length} cuentas exitosamente.`, 'success');
      setSeleccionadosInv([]);
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error en eliminación masiva: ' + error.message, 'error');
    } finally {
      setCargando(false);
    }
  }

  async function limpiarDuplicados() {
    if (!confirm('¿Estás seguro de limpiar los correos duplicados? El sistema conservará uno de cada correo y borrará los repetidos.')) return;
    
    setCargando(true);
    try {
      const { data, error } = await supabase.from('inventario').select('*');
      if (error) throw error;

      const correosMap = {};
      const idsAEliminar = [];

      data.forEach(item => {
        const correoLimpio = (item.correo || '').toLowerCase().trim();
        if (!correosMap[correoLimpio]) {
          correosMap[correoLimpio] = [];
        }
        correosMap[correoLimpio].push(item);
      });

      Object.values(correosMap).forEach(grupo => {
        if (grupo.length > 1) {
          grupo.sort((a, b) => a.estado === 'Asignada' ? -1 : 1);
          const aBorrar = grupo.slice(1);
          aBorrar.forEach(item => idsAEliminar.push(item.id));
        }
      });

      if (idsAEliminar.length === 0) {
        mostrarNotificacion('No se encontraron correos duplicados', 'success');
        setCargando(false);
        return;
      }

      for (let i = 0; i < idsAEliminar.length; i += 100) {
        const batch = idsAEliminar.slice(i, i + 100);
        const { error: deleteError } = await supabase.from('inventario').delete().in('id', batch);
        if (deleteError) throw deleteError;
      }

      mostrarNotificacion(`Limpieza exitosa: ${idsAEliminar.length} eliminados.`, 'success');
      cargarDatos(true);
    } catch (err) {
      mostrarNotificacion('Error al limpiar duplicados: ' + err.message, 'error');
    } finally {
      setCargando(false);
    }
  }

  async function sacarDelStock(id, correo) {
    if (!confirm(`¿Dar de baja la cuenta ${correo}? Saldrá del stock permanentemente.`)) return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) throw error;
      mostrarNotificacion('Cuenta eliminada', 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al eliminar cuenta: ' + error.message, 'error');
    }
  }

  function manejarSubidaArchivoTxt(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = (evento) => {
      const contenido = evento.target.result;
      setLoteCorreos((prev) => (prev ? prev + '\n' + contenido : contenido));
    };
    lector.readAsText(archivo);
  }

  async function procesarPegaInventario(e) {
    e.preventDefault();
    try {
      const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const correosEncontrados = loteCorreos.match(regexCorreos) || [];

      if (correosEncontrados.length === 0) {
        return mostrarNotificacion('No se encontraron correos válidos', 'error');
      }

      const correosUnicos = [...new Set(correosEncontrados.map(c => c.toLowerCase().trim()))];

      const { data: correosBD, error: errConsulta } = await supabase.from('inventario').select('correo');
      if (errConsulta) throw errConsulta;

      const setExistentes = new Set((correosBD || []).map((i) => (i.correo || '').toLowerCase().trim()));
      
      let nuevas = [];
      let dup = 0;

      for (let i = 0; i < correosUnicos.length; i++) {
        const correo = correosUnicos[i];
        if (!setExistentes.has(correo)) {
          nuevas.push({
            correo: correo,
            proveedor: loteProv,
            costo: parseFloat(loteCosto) || 0,
            precio_venta: parseFloat(lotePrecio) || 0, 
            estado: 'Disponible',
            cliente_asignado: null
          });
          setExistentes.add(correo); 
        } else {
          dup++;
        }
      }

      if (nuevas.length > 0) {
        const { error } = await supabase.from('inventario').insert(nuevas);
        if (error) throw error;
      }

      mostrarNotificacion(`Importados: ${nuevas.length} | Duplicados ignorados: ${dup}`, 'success');
      setLoteProv('');
      setLoteCosto('');
      setLotePrecio('');
      setLoteCorreos('');
      setModalInv(false);
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al guardar el lote: ' + error.message, 'error');
    }
  }

  function abrirModalAsignarDesdeInventario(correo) {
    setCliCuentaAsignada(correo);
    setModalCli(true);
  }

  async function guardarClienteNuevo(e) {
    e.preventDefault();

    const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const correosPega = cliCuentaAsignada.match(regexCorreos) || [];

    if (correosPega.length === 0) {
      mostrarNotificacion('No se detectaron correos en el texto ingresado', 'error');
      return;
    }

    const correosUnicos = [...new Set(correosPega.map(c => c.toLowerCase().trim()))];
    const itemsAAsignar = [];
    const correosNoDisponibles = [];

    for (const correo of correosUnicos) {
      const itemLibre = inventario.find(i => (i.correo || '').toLowerCase() === correo && i.estado === 'Disponible');
      if (itemLibre) {
        itemsAAsignar.push(itemLibre);
      } else {
        correosNoDisponibles.push(correo);
      }
    }

    if (correosNoDisponibles.length > 0) {
      mostrarNotificacion(`Error: ${correosNoDisponibles.length} correos no están libres en stock.`, 'error');
      return; 
    }

    try {
      const idsToUpdate = itemsAAsignar.map(i => i.id);
      const { error: invError } = await supabase
        .from('inventario')
        .update({ estado: 'Asignada', cliente_asignado: cliNom })
        .in('id', idsToUpdate);
        
      if (invError) throw invError;

      const nuevosClientes = itemsAAsignar.map(itemLibre => ({
        whatsapp: cliNum,
        nombre: cliNom,
        cuenta: `${itemLibre.correo} (${itemLibre.proveedor})`,
        inicio: cliInicio,
        fin: cliFin,
        estado: 'Activo',
        pago: cliPago,
      }));

      const { error: cliError } = await supabase.from('clientes').insert(nuevosClientes);
      if (cliError) throw cliError;

      cerrarModalCli(); 
      mostrarNotificacion(`¡${itemsAAsignar.length} cuentas asignadas exitosamente a ${cliNom}!`, 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error al guardar asignaciones: ' + error.message, 'error');
    }
  }

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
      mostrarNotificacion('Transacción registrada', 'success');
      cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('Error en control de gastos: ' + error.message, 'error');
    }
  }

  if (!session) {
    return (
      <div 
        className="flex h-screen items-center justify-center bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: "url('https://images.hdqwalls.com/download/itachi-uchiha-naruto-4k-yd-1920x1080.jpg')" }} 
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>

        {notificacion.visible && (
          <div className={`fixed top-8 right-8 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in ${
            notificacion.tipo === 'success' ? 'bg-green-900/90 border border-green-700 text-green-100' : 'bg-red-900/90 border border-red-700 text-red-100'
          }`}>
            {notificacion.tipo === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm tracking-wide">{notificacion.mensaje}</span>
          </div>
        )}

        <div className="relative z-10 bg-[#161821]/95 border border-[#2a2d3d] p-10 rounded-2xl w-full max-w-[26rem] shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black tracking-tight text-white mb-1">
              ALURIA<span className="text-red-500">.ADMIN</span>
            </h2>
            <p className="text-xs text-neutral-400 font-medium">
              Acceso Seguro al Panel
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Correo Admin</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-blue-400" />
                <input 
                  type="email" 
                  required 
                  value={emailLogin} 
                  onChange={(e) => setEmailLogin(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-[#e8f0fe] text-black border border-transparent rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner font-medium" 
                  placeholder="admin@aluria.com" 
                />
              </div>
            </div>
            
            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-amber-500" />
                <input 
                  type="password" 
                  required 
                  value={passLogin} 
                  onChange={(e) => setPassLogin(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0f111a] border border-[#2a2d3d] rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-red-500 transition shadow-inner font-medium" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 pb-1">
              <input type="checkbox" id="mantener" className="w-3.5 h-3.5 rounded border-gray-600 bg-[#0f111a] text-red-500 focus:ring-red-500 focus:ring-offset-[#161821] cursor-pointer" />
              <label htmlFor="mantener" className="text-xs text-neutral-300 cursor-pointer select-none">Mantener sesión activa</label>
            </div>

            <button type="submit" disabled={authLoading} className="w-full py-3 bg-[#d93838] hover:bg-[#b02c2c] text-white rounded-lg text-sm font-bold transition duration-200 shadow-lg flex justify-center items-center gap-2 tracking-wide">
              {authLoading ? 'Verificando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const numTc = parseFloat(tc) || 3.42;

  let costoStockVendidoUsdt = 0;
  let capitalStockLibreUsdt = 0;

  inventario.forEach((item) => {
    if (item.estado === 'Asignada') {
      costoStockVendidoUsdt += parseFloat(item.costo) || 0;
    } else if (item.estado === 'Disponible') {
      capitalStockLibreUsdt += parseFloat(item.costo) || 0;
    }
  });

  const cuentasLibres = inventario.filter((i) => i.estado === 'Disponible' && (!i.cliente_asignado || i.cliente_asignado.trim() === ''));
  const libres = cuentasLibres.length;

  let ingresosSoles = 0;
  clientes.forEach((cli) => {
    if ((cli.pago || '').trim() === 'Pagado') {
      const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const correosEnCliente = cli.cuenta.match(regexCorreos) || [];
      
      correosEnCliente.forEach(correoCli => {
        const invItem = inventario.find((i) => (i.correo || '').toLowerCase().trim() === correoCli.toLowerCase().trim());
        
        if (invItem && parseFloat(invItem.precio_venta) > 0) {
          ingresosSoles += parseFloat(invItem.precio_venta);
        } else {
          ingresosSoles += 35; 
        }
      });
    }
  });

  let cajaIngresos = 0;
  let cajaEgresos = 0;
  pagos.forEach((p) => {
    if (p.tipo === 'Ingreso') cajaIngresos += parseFloat(p.monto) || 0;
    else if (p.tipo === 'Egreso') cajaEgresos += parseFloat(p.monto) || 0;
  });

  const egresosVentasSoles = (costoStockVendidoUsdt * numTc) + cajaEgresos;
  const ingresosTotalesSoles = ingresosSoles + cajaIngresos;
  const gananciaNeta = ingresosTotalesSoles - egresosVentasSoles;
  const capitalLibreSoles = capitalStockLibreUsdt * numTc;

  // =====================================================================
  // 🔥 LÓGICA DE FECHAS (HOY LOCAL A PRUEBA DE ZONAS HORARIAS) 🔥
  // =====================================================================
  const dHoy = new Date();
  const yyyy = dHoy.getFullYear();
  const mm = String(dHoy.getMonth() + 1).padStart(2, '0');
  const dd = String(dHoy.getDate()).padStart(2, '0');
  const hoyStr = `${yyyy}-${mm}-${dd}`;

  const dManana = new Date();
  dManana.setDate(dManana.getDate() + 1);
  const mananaStr = `${dManana.getFullYear()}-${String(dManana.getMonth() + 1).padStart(2, '0')}-${String(dManana.getDate()).padStart(2, '0')}`;

  const cuentasQueVencenHoyAgrupadas = agruparPorWhatsapp(clientes.filter((c) => {
    return c.pago === 'Pagado' && c.fin && c.fin <= hoyStr;
  }));
  
  const deudasPendientesAgrupadas = agruparPorWhatsapp(clientes.filter((c) => c.pago === 'Pendiente'));
  
  const vencenMananaAgrupados = agruparPorWhatsapp(clientes.filter((c) => {
    return c.pago === 'Pagado' && c.fin === mananaStr;
  }));

  const inventarioGestion = inventario.filter(
    (i) =>
      i.correo.toLowerCase().includes(busquedaGestion.toLowerCase()) ||
      i.proveedor.toLowerCase().includes(busquedaGestion.toLowerCase())
  );

  const gastosComida = pagos
    .filter((p) => p.tipo === 'Egreso' && p.concepto && p.concepto.includes('[Comida]'))
    .reduce((a, b) => a + parseFloat(b.monto || 0), 0);
  const gastosPasajes = pagos
    .filter((p) => p.tipo === 'Egreso' && p.concepto && p.concepto.includes('[Pasajes]'))
    .reduce((a, b) => a + parseFloat(b.monto || 0), 0);
  const gastosDetalles = pagos
    .filter((p) => p.tipo === 'Egreso' && p.concepto && p.concepto.includes('[Detalles]'))
    .reduce((a, b) => a + parseFloat(b.monto || 0), 0);
  const gastosOtros = pagos
    .filter((p) => p.tipo === 'Egreso' && p.concepto && (p.concepto.includes('[Otros]') || !p.concepto.includes('[')))
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
    <div className="flex h-screen overflow-hidden bg-[#050505] text-neutral-100 font-sans relative w-full">
      
      {notificacion.visible && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in transition-all ${
          notificacion.tipo === 'success' ? 'bg-green-950/95 border border-green-800 text-green-400' : 'bg-red-950/95 border border-red-800 text-red-400'
        }`}>
          {notificacion.tipo === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold text-sm tracking-wide">{notificacion.mensaje}</span>
        </div>
      )}

      {/* 💻 MENÚ LATERAL */}
      <aside className="hidden md:flex w-72 border-r border-[#260505] bg-[#0a0a0a] flex-col justify-between shadow-2xl z-20 shrink-0">
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
            <BotonesMenu icono={<LayoutDashboard />} texto="Dashboard" vista="dashboard" vistaActual={vista} setVista={setVista} />
            <BotonesMenu icono={<Zap className="text-red-500" />} texto="Ventas Rápidas" vista="ventas" vistaActual={vista} setVista={setVista} />
            <BotonesMenu icono={<Package />} texto="Inventario" vista="inventario" vistaActual={vista} setVista={setVista} />
            <BotonesMenu icono={<Users />} texto="Clientes" vista="clientes" vistaActual={vista} setVista={setVista} />
            <BotonesMenu icono={<CalendarDays className="text-blue-400" />} texto="Fechas de Correos" vista="fechas" vistaActual={vista} setVista={setVista} />
            <BotonesMenu icono={<DollarSign className="text-green-500" />} texto="Gestión de Cuentas" vista="gestion" vistaActual={vista} setVista={setVista} />
            <BotonesMenu icono={<PieChart className="text-amber-500" />} texto="Control de Gastos" vista="gastos" vistaActual={vista} setVista={setVista} />
            <BotonesMenu icono={<Calculator className="text-pink-500" />} texto="Reembolsos" vista="reembolsos" vistaActual={vista} setVista={setVista} />
          </nav>
        </div>
        <div className="p-4 border-t border-[#260505] bg-[#050505]">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-950/30 transition border border-red-900/30 text-sm font-semibold tracking-wide shadow-sm">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 📱 BARRA INFERIOR MÓVIL */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0a0a0a] border-t border-[#260505] flex justify-around items-center py-2 px-1 z-40 shadow-2xl">
        <BotonMobile icono={<LayoutDashboard className="w-5 h-5" />} texto="Dash" vista="dashboard" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<Zap className="w-5 h-5 text-red-500" />} texto="Ventas" vista="ventas" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<Package className="w-5 h-5" />} texto="Stock" vista="inventario" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<Users className="w-5 h-5" />} texto="Clientes" vista="clientes" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<PieChart className="w-5 h-5 text-amber-500" />} texto="Gastos" vista="gastos" vistaActual={vista} setVista={setVista} />
        <BotonMobile icono={<Calculator className="w-5 h-5 text-pink-500" />} texto="Reembolsos" vista="reembolsos" vistaActual={vista} setVista={setVista} />
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-transparent relative pb-20 md:pb-0 w-full">
        <header className="sticky top-0 z-10 px-6 py-4 flex justify-between items-center border-b border-[#260505] bg-[#0a0a0a]/90 backdrop-blur-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="md:hidden p-2 rounded-xl bg-red-950/50 text-red-400 border border-red-900/40" title="Cerrar Sesión">
              <LogOut className="w-4 h-4" />
            </button>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white capitalize flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              {vista === 'clientes' ? 'Clientes' : vista === 'ventas' ? 'Ventas Rápidas' : vista === 'inventario' ? 'Inventario' : vista === 'gestion' ? 'Gestión de Cuentas' : vista === 'fechas' ? 'Fechas y Vencimientos' : vista === 'gastos' ? 'Control de Gastos' : vista === 'reembolsos' ? 'Panel de Reembolsos' : 'Dashboard Financiero'}
            </h1>
          </div>
          <div className="bg-[#141414] border border-[#3b0909] px-4 py-1.5 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-red-950/20">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Libre:</span>
            <span className="text-base font-extrabold text-white">{cargando ? '...' : libres}</span>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-8">
          {cargando ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              {vista === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="p-3.5 rounded-2xl flex items-center gap-4 border border-[#331111] bg-gradient-to-r from-[#140a0a] to-[#0f0707] shadow-xl">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">TC (USDT/Soles):</span>
                      <input type="number" step="0.01" value={tc} onChange={(e) => setTc(e.target.value)} className="w-24 px-3 py-1.5 bg-[#050505] border border-red-900/60 rounded-xl text-center font-extrabold text-white text-base focus:outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
                    </div>
                    <button onClick={() => setModalCaja(true)} className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-3 rounded-2xl text-sm font-bold transition border border-red-800/40 flex items-center gap-2 shadow-xl shadow-red-950">
                      <Wallet className="w-4 h-4 text-red-200" /> Añadir Gasto/Ingreso Extra
                    </button>
                  </div>

                  {/* TARJETA DE CAPITAL INVERTIDO */}
                  <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/60 flex flex-col md:flex-row justify-between items-start md:items-center text-sm font-semibold text-neutral-300 shadow-inner gap-2">
                    <span className="flex items-center gap-2 text-amber-500/80"><Package className="w-5 h-5"/> Capital Invertido en Cuentas Libres (Por Vender):</span>
                    <span className="text-white font-mono font-bold text-lg">S/ {capitalLibreSoles.toFixed(2)} <span className="text-neutral-500 text-xs font-normal">({capitalStockLibreUsdt.toFixed(2)} USDT)</span></span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-7 rounded-3xl border-t-4 border-t-red-600 border border-[#2b0d0d] bg-gradient-to-b from-[#140a0a] to-[#0a0505] shadow-2xl relative overflow-hidden">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-3">Ventas + Ingresos Extras</h3>
                      <p className="text-4xl font-black text-white">S/ {ingresosTotalesSoles.toFixed(2)}</p>
                      <div className="mt-3 pt-3 border-t border-red-900/30 flex justify-between text-xs font-bold text-neutral-400">
                        <span>Cuentas Vendidas: S/ {ingresosSoles.toFixed(2)}</span>
                        <span className="text-red-400">Extras: S/ {cajaIngresos.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-7 rounded-3xl border-t-4 border-t-[#6b1414] border border-[#2b0d0d] bg-gradient-to-b from-[#140a0a] to-[#0a0505] shadow-2xl relative overflow-hidden">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-3">Costo de lo Vendido + Gastos</h3>
                      <p className="text-4xl font-black text-red-500">S/ {egresosVentasSoles.toFixed(2)}</p>
                      <div className="mt-3 pt-3 border-t border-red-900/30 flex justify-between text-xs font-bold text-red-900/60">
                        <span>Costo Ventas: S/ {(costoStockVendidoUsdt * numTc).toFixed(2)}</span>
                        <span>Gastos: S/ {cajaEgresos.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-7 rounded-3xl border-t-4 border-t-neutral-400 border border-[#2b0d0d] bg-gradient-to-b from-[#140a0a] to-[#0a0505] shadow-2xl relative overflow-hidden">
                      <h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-3">Ganancia Neta de Ventas</h3>
                      <p className="text-4xl font-black text-neutral-100">S/ {gananciaNeta.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="p-7 rounded-3xl border border-[#3b0909] bg-gradient-to-r from-[#140a0a] via-[#0d0707] to-[#080404] space-y-5 shadow-2xl">
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5">
                      <AlertCircle className="w-6 h-6 text-red-500" /> Cobranza - Vencen Hoy o Atrasados
                    </h3>
                    {cuentasQueVencenHoyAgrupadas.length === 0 ? (
                      <p className="text-neutral-400 text-sm font-medium">Todos están al día con sus pagos o no hay vencimientos pendientes.</p>
                    ) : (
                      <div className="space-y-3">
                        {cuentasQueVencenHoyAgrupadas.map((grupo) => (
                          <div key={grupo.whatsapp} className="flex flex-wrap justify-between items-start md:items-center bg-[#0a0a0a] p-5 rounded-2xl border border-[#2b0d0d] gap-4 shadow-md">
                            <div>
                              <p className="font-bold text-white text-base">{grupo.nombre} <span className="text-xs text-neutral-400 font-normal">({grupo.whatsapp})</span></p>
                              <p className="text-xs text-red-400 font-mono mt-0.5">{grupo.cuentas.length} cuentas vencen hoy (Renovación: S/ {grupo.cuentas.length * 35})</p>
                              <div className="mt-2 flex flex-col gap-1">
                                {grupo.cuentas.map((c, i) => (
                                  <span key={i} className="text-[11px] text-blue-300 font-mono bg-[#050505] border border-neutral-900 px-2.5 py-1 rounded-md w-fit">{c.cuenta.split(' (')[0].trim()}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                              <button onClick={() => cancelarRenovacionGrupo(grupo.cuentas, grupo.nombre)} className="text-neutral-400 bg-neutral-900/50 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-neutral-800 hover:text-white transition">No renovó</button>
                              <button onClick={() => copiarTextoWp(grupo)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"><Copy className="w-3.5 h-3.5" /> Copiar Txt</button>
                              <a href={generarLinkWp(grupo)} target="_blank" rel="noreferrer" className="bg-[#1f0a0a] hover:bg-[#331111] text-red-300 border border-red-900/40 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">Abrir Wp</a>
                              <button onClick={() => renovarCobranzaGrupo(grupo.cuentas)} className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-red-950 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Renovar Todo</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-7 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] space-y-4 shadow-xl">
                      <h3 className="text-base font-extrabold text-red-500 flex items-center gap-2"><Wallet className="w-5 h-5" /> Deudas Pendientes</h3>
                      <div className="space-y-2">
                        {deudasPendientesAgrupadas.length === 0 ? (
                          <p className="text-neutral-400 text-sm font-medium">Todos al día 🎉</p>
                        ) : (
                          deudasPendientesAgrupadas.map((grupo) => (
                            <div key={grupo.whatsapp} className="flex justify-between items-start sm:items-center py-4 border-b border-neutral-900 text-sm gap-2 flex-col sm:flex-row">
                              <div>
                                <span className="font-bold text-gray-200 block">{grupo.nombre}</span>
                                <span className="text-xs text-red-400 font-bold">{grupo.cuentas.length} cuentas (Deuda: S/ {grupo.cuentas.length * 35})</span>
                                <div className="mt-1.5 flex flex-col gap-1">
                                  {grupo.cuentas.map((c, i) => (
                                    <span key={i} className="text-[10px] text-blue-300 font-mono bg-[#050505] border border-neutral-900 px-2 py-0.5 rounded-md w-fit">{c.cuenta.split(' (')[0].trim()}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap sm:flex-row items-center gap-2 mt-2 sm:mt-0">
                                <button onClick={() => cancelarRenovacionGrupo(grupo.cuentas, grupo.nombre)} className="text-neutral-400 bg-neutral-900/50 border border-neutral-800 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-neutral-800 transition" title="Liberar cuenta al stock">No renovó</button>
                                <button onClick={() => copiarTextoWp(grupo)} className="text-neutral-300 bg-neutral-800/80 border border-neutral-700 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-neutral-700 transition">Copiar Txt</button>
                                <button onClick={() => marcarComoPagadoGrupo(grupo.cuentas)} className="text-green-400 bg-green-950/40 border border-green-900/50 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-green-900/40 transition">✓ Pagó</button>
                                <a href={generarLinkWp(grupo)} target="_blank" rel="noreferrer" className="text-red-400 bg-red-950/40 border border-red-900/50 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-red-900/40 transition">Abrir Wp</a>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="p-7 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] space-y-4 shadow-xl">
                      <h3 className="text-base font-extrabold text-amber-500 flex items-center gap-2"><Clock className="w-5 h-5" /> Vencen Mañana ({mananaStr})</h3>
                      <div className="space-y-2">
                        {vencenMananaAgrupados.length === 0 ? (
                          <p className="text-neutral-400 text-sm font-medium">Nadie vence exactamente el día de mañana.</p>
                        ) : (
                          vencenMananaAgrupados.map((grupo) => (
                            <div key={grupo.whatsapp} className="flex justify-between items-start sm:items-center py-4 border-b border-neutral-900 text-sm flex-col sm:flex-row gap-2">
                              <div>
                                <span className="font-bold text-gray-200 block">{grupo.nombre}</span>
                                <span className="text-xs text-neutral-400 font-medium">{grupo.cuentas.length} cuentas por vencer</span>
                                <div className="mt-1.5 flex flex-col gap-1">
                                  {grupo.cuentas.map((c, i) => (
                                    <span key={i} className="text-[10px] text-blue-300 font-mono bg-[#050505] border border-neutral-900 px-2 py-0.5 rounded-md w-fit">{c.cuenta.split(' (')[0].trim()}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap sm:flex-row items-center gap-2 mt-2 sm:mt-0">
                                <span className="text-amber-400 font-extrabold text-xs bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">{grupo.cuentas[0].fin}</span>
                                <button onClick={() => copiarTextoWp(grupo)} className="text-neutral-300 bg-neutral-800/80 border border-neutral-700 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-neutral-700 transition">Copiar Txt</button>
                                <a href={generarLinkWp(grupo)} target="_blank" rel="noreferrer" className="text-red-400 bg-red-950/40 border border-red-900/50 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-red-900/40 transition">Abrir Wp</a>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA PANEL DE REEMBOLSOS (CON SUB PESTAÑAS) */}
              {vista === 'reembolsos' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  {/* PESTAÑAS */}
                  <div className="flex flex-wrap gap-3 border-b border-[#2b0d0d] pb-6">
                    <button onClick={() => setSubVistaReembolso('calculadora')} className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center gap-2 ${subVistaReembolso === 'calculadora' ? 'bg-pink-600/20 text-pink-400 border-pink-500/50 shadow-lg shadow-pink-900/20' : 'bg-[#140a0a] text-neutral-400 border-[#2b0d0d] hover:bg-[#1f0f0f]'}`}>
                      <Calculator className="w-4 h-4" /> Calculadora Individual
                    </button>
                    <button onClick={() => setSubVistaReembolso('masivo')} className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center gap-2 ${subVistaReembolso === 'masivo' ? 'bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-lg shadow-purple-900/20' : 'bg-[#140a0a] text-neutral-400 border-[#2b0d0d] hover:bg-[#1f0f0f]'}`}>
                      <Users className="w-4 h-4" /> Reembolsos Masivos y Notas
                    </button>
                  </div>

                  {subVistaReembolso === 'calculadora' ? (
                    /* PANEL CALCULADORA INDIVIDUAL */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
                      {/* PANEL IZQUIERDO: FORMULARIO */}
                      <div className="p-6 md:p-8 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl space-y-6">
                        <h3 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-3">
                          <span className="text-pink-500 font-mono">01</span> DATOS DEL SERVICIO
                        </h3>
                        
                        <form onSubmit={calcularReembolso} className="space-y-6">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Correo de la Cuenta</label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                              <input 
                                type="text" 
                                value={reembolsoCorreo} 
                                onChange={(e) => {
                                  const correo = e.target.value;
                                  setReembolsoCorreo(correo);
                                  
                                  // Auto-relleno Mágico de Fecha de Inicio
                                  if (correo.length > 5 && clientes.length > 0) {
                                    const cliMatch = clientes.find(c => (c.cuenta || '').toLowerCase().includes(correo.toLowerCase().trim()));
                                    if (cliMatch && cliMatch.inicio) {
                                      setReembolsoInicio(cliMatch.inicio);
                                    }
                                  }
                                }} 
                                required 
                                placeholder="ejemplo@correo.com" 
                                className="w-full bg-[#050505] border border-neutral-800 pl-11 pr-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-pink-600 transition shadow-inner font-mono" 
                              />
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-1">Este correo se usará si desasignas la cuenta. Busca automáticamente la fecha inicial.</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Moneda</label>
                              <select value={reembolsoMoneda} onChange={e => setReembolsoMoneda(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-600 font-bold transition shadow-inner">
                                <option value="Bs">Bs BOB</option>
                                <option value="S/">S/ PEN</option>
                                <option value="$">USD</option>
                                <option value="€">EUR</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Monto pagado</label>
                              <input type="number" step="0.01" value={reembolsoMonto} onChange={e => setReembolsoMonto(e.target.value)} required placeholder="0.00" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-600 font-mono transition shadow-inner" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Inicio del servicio</label>
                              <input type="date" value={reembolsoInicio} onChange={e => setReembolsoInicio(e.target.value)} required className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-neutral-300 outline-none focus:ring-2 focus:ring-pink-600 transition shadow-inner" />
                            </div>
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Reporte de la falla</label>
                              <input type="date" value={reembolsoFalla} onChange={e => setReembolsoFalla(e.target.value)} required className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-neutral-300 outline-none focus:ring-2 focus:ring-pink-600 transition shadow-inner" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">Duración del plan contratado</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {[7, 15, 30, 60].map(d => (
                                <button type="button" key={d} onClick={() => setReembolsoDuracion(d)} className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${reembolsoDuracion === d ? 'bg-pink-600/20 border-pink-500/50 text-pink-400' : 'bg-[#140a0a] text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'}`}>
                                  {d} {d===30?'(1 mes)':d===60?'(2 meses)':'días'}
                                </button>
                              ))}
                            </div>
                            <div className="relative">
                              <input type="number" value={reembolsoDuracion} onChange={e => setReembolsoDuracion(Number(e.target.value))} required className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-600 transition shadow-inner pl-4 pr-12 font-mono" />
                              <span className="absolute right-4 top-3.5 text-sm font-bold text-neutral-500">días</span>
                            </div>
                          </div>

                          <button type="submit" className="w-full bg-[#961b3b] hover:bg-[#b52248] text-white px-5 py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-pink-950/40 border border-pink-900/50 flex items-center justify-center gap-2 tracking-wide mt-2">
                            <Calculator className="w-4 h-4" /> Calcular reembolso
                          </button>
                        </form>
                      </div>

                      {/* PANEL DERECHO: COMPROBANTE */}
                      <div className="p-6 md:p-8 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl relative min-h-[500px] flex flex-col">
                        <h3 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-3 mb-6">
                          <span className="text-pink-500 font-mono">02</span> COMPROBANTE
                        </h3>
                        
                        {resultadoReembolso ? (
                          <div className="flex-1 flex flex-col justify-between animate-fade-in space-y-8">
                            <div>
                              {/* Cabecera Comprobante */}
                              <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
                                <div>
                                  <span className="text-xs font-bold text-pink-600 tracking-widest uppercase block mb-1">Reembolso</span>
                                  <span className="text-base font-bold text-white font-mono break-all">{resultadoReembolso.correo}</span>
                                </div>
                                <span className="text-xs text-neutral-500 font-mono uppercase">RJ-{new Date().toISOString().replace(/\D/g,'').slice(0,10)}</span>
                              </div>

                              {/* Monto Principal */}
                              <div className="text-center py-8">
                                <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-2 block">Monto a devolver</span>
                                <div className="text-[3rem] leading-none font-black text-white font-mono">
                                  {resultadoReembolso.moneda} <span className="tracking-tight">{resultadoReembolso.aDevolver.toFixed(2)}</span>
                                </div>
                                <div className="mt-4">
                                  <span className="inline-block px-5 py-1.5 rounded-full border border-teal-500/40 bg-teal-500/10 text-teal-400 text-xs font-bold tracking-widest">
                                    CORRESPONDE REEMBOLSO
                                  </span>
                                </div>
                              </div>

                              {/* Tabla de desglose */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm border-t border-b border-neutral-800 border-dashed py-6">
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Monto pagado</span> <span className="font-mono text-neutral-200 font-bold">{resultadoReembolso.moneda} {resultadoReembolso.montoS.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Plan contratado</span> <span className="font-mono text-neutral-200 font-bold">{resultadoReembolso.duracion} días</span></div>
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Inicio</span> <span className="font-mono text-neutral-200 font-bold">{resultadoReembolso.inicio}</span></div>
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Falla reportada</span> <span className="font-mono text-neutral-200 font-bold">{resultadoReembolso.falla}</span></div>
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Valor por día</span> <span className="font-mono text-neutral-200 font-bold">{resultadoReembolso.moneda} {resultadoReembolso.valorPorDia.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Días usados</span> <span className="font-mono text-neutral-200 font-bold">{resultadoReembolso.diasUsados} de {resultadoReembolso.duracion}</span></div>
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Días sin usar</span> <span className="font-mono text-white font-bold">{resultadoReembolso.diasSinUsar}</span></div>
                                <div className="flex justify-between items-center"><span className="text-neutral-500">Ya consumido</span> <span className="font-mono text-neutral-200 font-bold">{resultadoReembolso.moneda} {resultadoReembolso.consumido.toFixed(2)}</span></div>
                              </div>

                              {/* Formula Explicativa */}
                              <div className="bg-[#140a0a] p-4 rounded-xl border border-pink-900/20 font-mono text-xs text-neutral-400 mt-6 leading-relaxed shadow-inner text-center">
                                {resultadoReembolso.moneda} {resultadoReembolso.montoS.toFixed(2)} ÷ {resultadoReembolso.duracion} = {resultadoReembolso.moneda} {resultadoReembolso.valorPorDia.toFixed(2)} por día × {resultadoReembolso.diasSinUsar} días sin usar = <span className="text-pink-400 font-bold">{resultadoReembolso.moneda} {resultadoReembolso.aDevolver.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Botones de acción finales */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#2b0d0d]">
                              <button onClick={desasignarDesdeReembolso} className="flex-1 bg-red-950/40 hover:bg-red-900/50 text-red-400 py-3.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 border border-red-900/40 shadow-sm" title="Quitar este correo al cliente y devolver al stock">
                                <UserMinus className="w-4 h-4" /> Desasignar Cuenta
                              </button>
                              <button onClick={copiarComprobanteReembolso} className="flex-1 bg-[#124d40] hover:bg-[#186655] text-white py-3.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 border border-[#1b7360] shadow-lg shadow-[#0f3d32]">
                                <Copy className="w-4 h-4" /> Copiar texto
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 bg-[#0a0a0a] rounded-2xl border border-neutral-900 border-dashed">
                            <Calculator className="w-16 h-16 mb-4 opacity-30 text-neutral-500" />
                            <p className="text-sm font-medium">Ingresa los datos del cliente para calcular.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* PANEL REEMBOLSO MASIVO */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
                      {/* LADO IZQUIERDO: TEXTAREA MASIVO */}
                      <div className="p-6 md:p-8 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl space-y-6">
                        <h3 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-3">
                          <Users className="text-purple-500 w-5 h-5" /> REEMBOLSO MASIVO
                        </h3>
                        <p className="text-sm text-neutral-400">Pega el texto con los correos. El sistema extraerá solo los correos, los borrará de la base de datos (inventario/cliente), y generará una nota de reembolso calculando los días faltantes.</p>

                        <form onSubmit={procesarReembolsoMasivo} className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Fecha de Falla / Caída</label>
                              <input type="date" required value={masivoFalla} onChange={e => setMasivoFalla(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-neutral-300 outline-none focus:ring-2 focus:ring-purple-600 transition shadow-inner" />
                            </div>
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Plan Contratado</label>
                              <div className="relative">
                                <input type="number" value={masivoDuracion} onChange={e => setMasivoDuracion(Number(e.target.value))} required className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-purple-600 transition shadow-inner pl-4 pr-12 font-mono" />
                                <span className="absolute right-4 top-3.5 text-sm font-bold text-neutral-500">días</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">Pega la lista de correos</label>
                            <textarea 
                              rows="8" 
                              required 
                              value={masivoTexto} 
                              onChange={e => setMasivoTexto(e.target.value)} 
                              placeholder="Ejemplo:&#10;rikimartinez508@gmail.com CORTAR&#10;chaiolgam3r@gmail.com CORTAR..." 
                              className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-4 text-sm text-white font-mono resize-none outline-none focus:ring-2 focus:ring-purple-600 shadow-inner"
                            ></textarea>
                          </div>

                          <button type="submit" className="w-full bg-gradient-to-r from-purple-900 to-[#800f11] hover:from-purple-800 hover:to-red-800 text-white px-5 py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-950/40 border border-purple-900/50 flex items-center justify-center gap-2 tracking-wide mt-2">
                            <Trash2 className="w-4 h-4" /> Eliminar Cuentas y Generar Notas
                          </button>
                        </form>
                      </div>

                      {/* LADO DERECHO: BLOCK DE NOTAS */}
                      <div className="p-6 md:p-8 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl relative min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#2b0d0d]">
                          <h3 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-3">
                            <FileText className="text-purple-500 w-5 h-5" /> NOTAS DE REEMBOLSOS
                          </h3>
                          <button onClick={() => {if(confirm('¿Seguro que quieres borrar todas las notas guardadas?')) setMasivoNotas('')}} className="text-xs px-3 py-2 bg-red-950/40 text-red-400 font-bold rounded-lg border border-red-900/50 hover:bg-red-900/50 transition">
                            Limpiar Hoja
                          </button>
                        </div>
                        
                        <textarea 
                          value={masivoNotas}
                          onChange={(e) => setMasivoNotas(e.target.value)}
                          placeholder="Aquí aparecerá automáticamente el resumen de todos los reembolsos realizados..."
                          className="flex-1 w-full bg-[#050505] border border-neutral-800 rounded-xl p-4 text-xs sm:text-sm text-neutral-300 font-mono resize-none outline-none focus:ring-2 focus:ring-purple-600 shadow-inner leading-relaxed whitespace-pre-wrap"
                        ></textarea>

                        <button onClick={() => {navigator.clipboard.writeText(masivoNotas); mostrarNotificacion('Notas copiadas al portapapeles', 'success')}} className="mt-4 w-full bg-[#141414] hover:bg-neutral-800 text-neutral-300 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 border border-neutral-800">
                          <Copy className="w-4 h-4" /> Copiar todo el texto
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* VISTA FECHAS */}
              {vista === 'fechas' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-5 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] flex flex-col md:flex-row justify-between items-center shadow-xl gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-400" /> Calendario de Vencimientos
                    </h2>
                    <span className="text-xs font-semibold text-neutral-400 bg-[#140a0a] px-4 py-2 rounded-xl border border-[#2b0d0d]">
                      Cuentas Activas: <strong className="text-white">{clientes.length}</strong>
                    </span>
                  </div>

                  <div className="space-y-6">
                    {(() => {
                      const gruposPorDia = {};
                      for (let i = 1; i <= 31; i++) gruposPorDia[i] = [];
                      
                      clientes.forEach(c => {
                        if (c.fin) {
                          const dia = parseInt(c.fin.split('-')[2], 10);
                          if (!isNaN(dia) && dia >= 1 && dia <= 31) {
                            gruposPorDia[dia].push(c);
                          }
                        }
                      });

                      const diasRenderizados = Object.keys(gruposPorDia).filter(dia => gruposPorDia[dia].length > 0);

                      if (diasRenderizados.length === 0) {
                        return <div className="text-center py-16 text-neutral-400 p-8 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d]">No hay clientes con fechas asignadas.</div>;
                      }

                      return diasRenderizados.map(dia => {
                        const lista = gruposPorDia[dia].sort((a, b) => a.nombre.localeCompare(b.nombre));
                        
                        return (
                          <div key={dia} className="rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d] overflow-hidden shadow-2xl">
                            <div className="bg-gradient-to-r from-[#140a0a] to-[#0a0505] border-b border-[#2b0d0d] px-6 py-4 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                                <span className="text-blue-400 font-extrabold text-lg">{String(dia).padStart(2, '0')}</span>
                              </div>
                              <h3 className="text-white font-bold text-base tracking-wide">Vencen los días {dia}</h3>
                              <span className="ml-auto text-xs font-bold text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full">{lista.length} Clientes</span>
                            </div>
                            <div className="divide-y divide-neutral-900">
                              {lista.map(c => {
                                const hoy = new Date();
                                hoy.setHours(0,0,0,0);
                                const arrFin = c.fin ? c.fin.split('-') : [];
                                const dFin = arrFin.length === 3 ? new Date(arrFin[0], arrFin[1] - 1, arrFin[2]) : new Date();
                                const difDias = Math.ceil((dFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                                
                                let colorDias = 'text-green-400 bg-green-500/10 border-green-500/20';
                                if (difDias < 0) colorDias = 'text-red-500 bg-red-500/10 border-red-500/20';
                                else if (difDias <= 3) colorDias = 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                                return (
                                  <div key={c.id} className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-neutral-900/40 transition">
                                    <div>
                                      <p className="font-bold text-white text-base">{c.nombre} <span className="text-xs text-neutral-400 font-normal">({c.whatsapp})</span></p>
                                      <p className="text-xs text-blue-300 font-mono mt-1 whitespace-pre-wrap leading-relaxed bg-[#050505] p-2 rounded-lg border border-neutral-900">{c.cuenta.replace(/,\s*/g, '\n')}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                      <div className="text-right">
                                        <p className="text-xs text-neutral-500 font-medium">Inicio: {c.inicio || '-'}</p>
                                        <p className="text-sm font-bold text-neutral-200">Vence: {c.fin}</p>
                                      </div>
                                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${colorDias}`}>
                                        {difDias < 0 ? `Vencido (${Math.abs(difDias)} d)` : difDias === 0 ? '¡Vence Hoy!' : `Faltan ${difDias} días`}
                                      </span>
                                      
                                      <button onClick={() => cancelarRenovacionCliente(c)} className="p-2.5 bg-neutral-800 hover:bg-red-900/40 text-red-400 rounded-xl transition border border-neutral-700 hover:border-red-900/50 shadow-sm" title="No renovó (Liberar Cuentas y Eliminar)">
                                        <UserMinus className="w-4 h-4" />
                                      </button>
                                      
                                      <button onClick={() => abrirEditarCliente(c)} className="p-2.5 bg-neutral-800 hover:bg-blue-900/40 text-blue-400 rounded-xl transition border border-neutral-700 hover:border-blue-900/50 shadow-sm" title="Editar Cliente">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* VISTA VENTAS */}
              {vista === 'ventas' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Cuentas Listas para Entregar ({cuentasLibres.length})</h2>
                    <button onClick={() => cargarDatos(false)} className="bg-[#141414] hover:bg-neutral-800 text-neutral-300 px-4 py-2.5 rounded-2xl text-sm transition border border-neutral-800 flex items-center gap-2 shadow-sm font-semibold"><RefreshCw className="w-4 h-4" /> Actualizar</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cuentasLibres.length === 0 ? (
                      <div className="col-span-full text-center py-16 text-neutral-400 p-8 rounded-3xl border border-[#2b0d0d] bg-[#0d0d0d]">No hay stock disponible.</div>
                    ) : (
                      cuentasLibres.map((acc) => {
                        const hoy = new Date();
                        if (hoy.getHours() >= 20) hoy.setDate(hoy.getDate() + 1);
                        hoy.setMonth(hoy.getMonth() + 1);
                        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                        const fechaF = ('0' + hoy.getDate()).slice(-2) + meses[hoy.getMonth()];
                        const textoWP = `CCARG#N${acc.id}( ${fechaF})\n${acc.correo}\n🔑 889900\nBOT TELEGRAM`;

                        return (
                          <div key={acc.id} className="p-6 rounded-3xl border border-[#2b0d0d] bg-gradient-to-b from-[#120707] to-[#080303] flex flex-col justify-between space-y-5 shadow-2xl">
                            <pre className="text-xs font-mono text-neutral-200 bg-[#050505] p-4 rounded-2xl whitespace-pre-wrap border border-neutral-900 shadow-inner">{textoWP}</pre>
                            <div className="flex justify-between items-center pt-3 border-t border-neutral-950">
                              <span className="text-xs font-extrabold text-red-500 bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-900/40">ID Stock #{acc.id}</span>
                              <button onClick={() => { navigator.clipboard.writeText(textoWP); setCopiadoIdx(acc.id); setTimeout(() => setCopiadoIdx(null), 1500); mostrarNotificacion('Copiado al portapapeles', 'success')}} className={`text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg ${copiadoIdx === acc.id ? 'bg-neutral-800' : 'bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 shadow-red-950'}`}>
                                {copiadoIdx === acc.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
                      <input type="text" value={busquedaInv} onChange={(e) => setBusquedaInv(e.target.value)} placeholder="Buscar correo o proveedor..." className="w-full pl-11 pr-4 py-2.5 bg-[#050505] border border-neutral-800 rounded-xl text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                      {seleccionadosInv.length > 0 && (
                        <button onClick={eliminarSeleccionados} className="bg-red-950 hover:bg-red-900 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-red-900/50 flex items-center gap-2 shadow-sm animate-fade-in">
                          <Trash2 className="w-4 h-4" /> Eliminar Seleccionados ({seleccionadosInv.length})
                        </button>
                      )}
                      <button onClick={() => setModalReemplazo(true)} className="bg-gradient-to-r from-purple-900 to-red-900 hover:from-purple-800 hover:to-red-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition border border-red-800/50 flex items-center gap-2 shadow-sm">
                        <RefreshCw className="w-4 h-4" /> Reemplazar Caídas
                      </button>

                      <button onClick={limpiarDuplicados} className="bg-red-950 hover:bg-red-900 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-red-900/50 flex items-center gap-2 shadow-sm">
                        <Trash2 className="w-4 h-4" /> Limpiar Duplicados
                      </button>
                      <button onClick={() => exportarACSV(inventario, 'inventario_aluria')} className="bg-[#141414] hover:bg-neutral-800 text-neutral-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-neutral-800 flex items-center gap-2 shadow-sm"><Download className="w-4 h-4" /> CSV</button>
                      <button onClick={() => setModalInv(true)} className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-red-950 flex items-center gap-2"><Plus className="w-4 h-4" /> Importar Lote</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                        <tr>
                          <th className="px-6 py-4 w-12 text-center">
                            <input 
                              type="checkbox" 
                              onChange={() => toggleSeleccionTodos(inventarioFiltrado)} 
                              checked={inventarioFiltrado.length > 0 && seleccionadosInv.length === inventarioFiltrado.length} 
                              className="w-4 h-4 rounded border-gray-600 bg-[#050505] text-red-600 focus:ring-red-500 cursor-pointer" 
                            />
                          </th>
                          <th className="px-6 py-4 w-12 text-neutral-400">#</th>
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
                          <tr><td colSpan="9" className="text-center py-12 text-neutral-500 font-medium">Sin resultados en inventario.</td></tr>
                        ) : (
                          inventarioFiltrado.map((item, idx) => (
                            <tr key={item.id} className={`transition ${seleccionadosInv.includes(item.id) ? 'bg-red-900/20' : 'hover:bg-neutral-900/40'}`}>
                              <td className="px-6 py-4 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={seleccionadosInv.includes(item.id)} 
                                  onChange={() => toggleSeleccionInv(item.id)} 
                                  className="w-4 h-4 rounded border-gray-600 bg-[#050505] text-red-600 focus:ring-red-500 cursor-pointer" 
                                />
                              </td>
                              <td className="px-6 py-4 text-neutral-500 font-bold">{idx + 1}</td>
                              <td className="px-6 py-4 font-bold text-white">{item.correo}</td>
                              <td className="px-6 py-4 text-neutral-400">{item.proveedor}</td>
                              <td className="px-6 py-4 text-neutral-300 font-mono">${item.costo}</td>
                              <td className="px-6 py-4 text-neutral-300 font-mono">S/{item.precio_venta}</td>
                              <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${item.estado === 'Disponible' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>{item.estado}</span></td>
                              <td className="px-6 py-4 text-neutral-400">{item.cliente_asignado || '-'}</td>
                              <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                {item.estado === 'Disponible' && (
                                  <button onClick={() => abrirModalAsignarDesdeInventario(item.correo)} className="p-2.5 bg-red-900/40 hover:bg-red-600/40 text-red-300 rounded-xl transition border border-red-900/30 shadow-sm" title="Asignar Cliente">
                                    <UserPlus className="w-4 h-4" />
                                  </button>
                                )}
                                {item.estado === 'Asignada' && (
                                  <button onClick={() => desasignarCuentaUnica(item)} className="p-2.5 bg-amber-900/40 hover:bg-amber-600/40 text-amber-400 rounded-xl transition border border-amber-900/30 shadow-sm" title="Desasignar y liberar cuenta">
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => sacarDelStock(item.id, item.correo)} className="p-2.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl transition border border-red-900/30 shadow-sm" title="Eliminar Permanente"><Trash2 className="w-4 h-4" /></button>
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
                      <input type="text" value={busquedaCli} onChange={(e) => setBusquedaCli(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-11 pr-4 py-2.5 bg-[#050505] border border-neutral-800 rounded-xl text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                      <button onClick={() => exportarACSV(clientes, 'clientes_aluria')} className="bg-[#141414] hover:bg-neutral-800 text-neutral-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-neutral-800 flex items-center gap-2 shadow-sm"><Download className="w-4 h-4" /> Exportar CSV</button>
                      <button onClick={() => setModoResumen(!modoResumen)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${modoResumen ? 'bg-red-900 text-white border border-red-700' : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'}`}><TrendingUp className="w-4 h-4" /> {modoResumen ? 'Ver Directorio Normal' : 'Ver Resumen LTV'}</button>
                      <button onClick={() => { setCliNom(''); setCliNum(''); setCliCuentaAsignada(''); setModalCli(true); }} className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-red-950 flex items-center gap-2"><Plus className="w-4 h-4" /> Asignar / Nuevo</button>
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
                            <tr><td colSpan="5" className="text-center py-12 text-neutral-500 font-medium">Sin resultados</td></tr>
                          ) : (
                            clientesFiltrados.map((c) => (
                              <tr key={c.id} className="hover:bg-neutral-900/40 transition">
                                <td className="px-6 py-4 font-bold text-white">{c.nombre}<span className="block text-xs text-neutral-400 font-normal">{c.whatsapp}</span></td>
                                <td className="px-6 py-4 font-mono text-xs text-red-400 whitespace-pre-wrap">{c.cuenta.replace(/,\s*/g, '\n')}</td>
                                <td className="px-6 py-4 text-neutral-200 font-semibold">{c.fin}</td>
                                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${c.pago === 'Pendiente' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'}`}>{c.pago}</span></td>
                                <td className="px-6 py-4 text-center flex justify-center gap-2">
                                  <button onClick={() => abrirEditarCliente(c)} className="p-2.5 bg-neutral-800 hover:bg-blue-900/40 text-blue-400 rounded-xl transition border border-neutral-700 hover:border-blue-900/50 shadow-sm" title="Editar Cliente"><Edit className="w-4 h-4" /></button>
                                  <button onClick={() => eliminarClienteYLiberar(c.id, c.cuenta)} className="p-2.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl transition border border-red-900/30 shadow-sm" title="Eliminar y Liberar Cuentas"><Trash2 className="w-4 h-4" /></button>
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
                            <th className="px-6 py-4 text-center">Cuentas Activas</th>
                            <th className="px-6 py-4 text-center">Aporte Mensual (S/)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                          {(() => {
                            let ltv = {};
                            clientes.forEach((cli) => {
                              if (!ltv[cli.whatsapp]) ltv[cli.whatsapp] = { nom: cli.nombre, w: cli.whatsapp, numCuentas: 0, aporte: 0 };
                              ltv[cli.whatsapp].numCuentas++;
                              
                              const regexCorreos = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                              const correos = cli.cuenta.match(regexCorreos) || [];
                              correos.forEach(correo => {
                                const invMatch = inventario.find((it) => (it.correo || '').trim().toLowerCase() === correo.toLowerCase().trim());
                                if (invMatch && parseFloat(invMatch.precio_venta) > 0) {
                                  ltv[cli.whatsapp].aporte += parseFloat(invMatch.precio_venta);
                                } else {
                                  ltv[cli.whatsapp].aporte += 35; // Fallback
                                }
                              });
                            });
                            const top = Object.values(ltv).sort((a, b) => b.aporte - a.aporte);
                            if (top.length === 0) return <tr><td colSpan="3" className="text-center py-12 text-neutral-500 font-medium">Sin datos para LTV</td></tr>;
                            return top.map((t, idx) => (
                              <tr key={idx} className="hover:bg-neutral-900/40 transition">
                                <td className="px-6 py-4 font-bold text-white">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`} {t.nom} <span className="block text-xs text-neutral-400 font-normal">{t.w}</span></td>
                                <td className="px-6 py-4 text-center font-extrabold text-red-400 text-base">{t.numCuentas}</td>
                                <td className="px-6 py-4 text-center font-extrabold text-white text-base">S/ {t.aporte.toFixed(2)}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {vista === 'gestion' && (
                <div className="rounded-3xl overflow-hidden animate-fade-in border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl">
                  <div className="p-5 border-b border-[#2b0d0d] flex flex-wrap justify-between items-center bg-[#140a0a] gap-4">
                    <div className="relative w-full md:w-1/3">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                      <input type="text" value={busquedaGestion} onChange={(e) => setBusquedaGestion(e.target.value)} placeholder="Buscar por correo o proveedor..." className="w-full pl-11 pr-4 py-2.5 bg-[#050505] border border-neutral-800 rounded-xl text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <span className="text-xs font-semibold text-neutral-400 bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-800">Total registros: <strong className="text-white">{inventario.length}</strong> cuentas</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                        <tr>
                          <th className="px-6 py-4 w-12 text-neutral-400">#</th>
                          <th className="px-6 py-4">Correo Cuenta</th>
                          <th className="px-6 py-4">Proveedor</th>
                          <th className="px-6 py-4">Costo ($)</th>
                          <th className="px-6 py-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900">
                        {inventarioGestion.length === 0 ? (
                          <tr><td colSpan="5" className="text-center py-12 text-neutral-500 font-medium">Sin cuentas registradas en el sistema.</td></tr>
                        ) : (
                          inventarioGestion.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-neutral-900/40 transition">
                              <td className="px-6 py-4 text-neutral-500 font-bold">{idx + 1}</td>
                              <td className="px-6 py-4 font-bold text-white">{item.correo}</td>
                              <td className="px-6 py-4 text-neutral-400">{item.proveedor}</td>
                              <td className="px-6 py-4 text-neutral-300 font-mono">${item.costo}</td>
                              <td className="px-6 py-4 text-center space-x-3 flex items-center justify-center gap-2">
                                {item.estado === 'Asignada' && (
                                  <button onClick={() => desasignarCuentaUnica(item)} className="px-3 py-2 bg-amber-900/40 hover:bg-amber-600/40 text-amber-400 border border-amber-900/30 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5" title="Desasignar Cliente">
                                    <UserMinus className="w-3.5 h-3.5" /> Desasignar
                                  </button>
                                )}
                                <button onClick={() => sacarDelStock(item.id, item.correo)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-neutral-700 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5">
                                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
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

              {vista === 'gastos' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-6 rounded-3xl border-t-4 border-t-amber-500 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl"><h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">Comida</h3><p className="text-3xl font-extrabold text-amber-400">S/ {gastosComida.toFixed(2)}</p></div>
                    <div className="p-6 rounded-3xl border-t-4 border-t-red-600 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl"><h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">Pasajes</h3><p className="text-3xl font-extrabold text-red-400">S/ {gastosPasajes.toFixed(2)}</p></div>
                    <div className="p-6 rounded-3xl border-t-4 border-t-purple-500 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl"><h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">Detalles</h3><p className="text-3xl font-extrabold text-purple-400">S/ {gastosDetalles.toFixed(2)}</p></div>
                    <div className="p-6 rounded-3xl border-t-4 border-t-neutral-400 border border-[#2b0d0d] bg-[#0d0d0d] shadow-xl"><h3 className="text-neutral-400 text-xs uppercase tracking-widest font-extrabold mb-2">Otros</h3><p className="text-3xl font-extrabold text-neutral-200">S/ {gastosOtros.toFixed(2)}</p></div>
                  </div>

                  <div className="rounded-3xl overflow-hidden border border-[#2b0d0d] bg-[#0d0d0d] shadow-2xl">
                    <div className="p-5 border-b border-[#2b0d0d] flex justify-between items-center bg-[#140a0a]">
                      <h3 className="font-bold text-white text-base">Historial de Transacciones y Gastos Acumulados</h3>
                      <button onClick={() => setModalCaja(true)} className="bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-red-950 flex items-center gap-2"><Plus className="w-4 h-4" /> Registrar Nuevo Gasto</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#140a0a] text-red-500 border-b border-[#2b0d0d] uppercase tracking-wider text-xs font-bold">
                          <tr><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Concepto / Categoría</th><th className="px-6 py-4">Tipo</th><th className="px-6 py-4 text-right">Monto (S/)</th></tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                          {pagos.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-12 text-neutral-500 font-medium">No hay gastos ni ingresos extras registrados.</td></tr>
                          ) : (
                            pagos.map((p) => (
                              <tr key={p.id} className="hover:bg-neutral-900/40 transition">
                                <td className="px-6 py-4 text-neutral-400 font-mono">{p.fecha}</td>
                                <td className="px-6 py-4 font-bold text-white">{p.concepto}</td>
                                <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${p.tipo === 'Ingreso' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'}`}>{p.tipo}</span></td>
                                <td className={`px-6 py-4 text-right font-extrabold font-mono text-base ${p.tipo === 'Ingreso' ? 'text-red-500' : 'text-neutral-200'}`}>{p.tipo === 'Ingreso' ? '+' : '-'} S/ {parseFloat(p.monto).toFixed(2)}</td>
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

      {/* MODAL IMPORTAR INVENTARIO */}
      {modalInv && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] border border-[#3b0909] rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl shadow-red-950">
            <div className="flex justify-between items-center border-b border-[#2b0d0d] pb-4">
              <h3 className="text-xl font-extrabold text-white">Importar Inventario Lote</h3>
              <button onClick={() => setModalInv(false)} className="text-neutral-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={procesarPegaInventario} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">Proveedor</label>
                <input type="text" required value={loteProv} onChange={(e) => setLoteProv(e.target.value)} placeholder="Nombre del proveedor" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">Costo USDT</label>
                  <input type="number" step="0.01" required value={loteCosto} onChange={(e) => setLoteCosto(e.target.value)} placeholder="0.00" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">Precio Soles (¡Importante!)</label>
                  <input type="number" step="0.01" required value={lotePrecio} onChange={(e) => setLotePrecio(e.target.value)} placeholder="Ej. 35.00" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block flex items-center gap-2"><Upload className="w-4 h-4 text-red-500" /> Subir Archivo (.txt)</label>
                <input type="file" accept=".txt" onChange={manejarSubidaArchivoTxt} className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-950/40 file:text-red-300 hover:file:bg-red-900/40 cursor-pointer border border-neutral-800 rounded-xl p-2 bg-[#050505]" />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">O pega el texto aquí (Se extraerán automáticamente)</label>
                <textarea rows="5" required value={loteCorreos} onChange={(e) => setLoteCorreos(e.target.value)} placeholder="Pega o carga el texto aquí..." className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-mono resize-none focus:ring-2 focus:ring-red-600 shadow-inner"></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button type="button" onClick={() => setModalInv(false)} className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950">Guardar Lote</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REEMPLAZO DE CAÍDAS */}
      {modalReemplazo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] border border-[#3b0909] rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl shadow-red-950">
            <div className="flex justify-between items-center border-b border-[#2b0d0d] pb-4">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-red-500" /> Reemplazo de Caídas
              </h3>
              <button onClick={cerrarModalReemplazo} className="text-neutral-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <p className="text-sm text-neutral-400 leading-relaxed">
              Pega el texto exactamente como te lo mandan. El sistema detectará en <strong className="text-red-400">pares</strong> los correos: el primero será el Antiguo y el segundo el Nuevo. Actualizará el stock y la cuenta del cliente automáticamente.
            </p>

            <form onSubmit={procesarReemplazos} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                  Pegar formato de reemplazo
                </label>
                <textarea 
                  rows="6" 
                  required 
                  value={textoReemplazo} 
                  onChange={(e) => setTextoReemplazo(e.target.value)} 
                  placeholder="Ejemplo:&#10;📨 ANTERIOR&#10;viejo@gmail.com&#10;&#10;➡️ NUEVO&#10;nuevo@gmail.com" 
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-mono resize-none focus:ring-2 focus:ring-red-600 shadow-inner"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button type="button" onClick={cerrarModalReemplazo} className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-purple-900 to-red-800 hover:from-purple-800 hover:to-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950">Ejecutar Reemplazo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CLIENTE */}
      {modalEditarCli && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] border border-[#3b0909] rounded-3xl w-full max-w-md p-8 space-y-5 shadow-2xl shadow-blue-950/40">
            <div className="flex justify-between items-center border-b border-[#2b0d0d] pb-4">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2"><Edit className="w-5 h-5 text-blue-400"/> Editar Cliente</h3>
              <button onClick={() => { setModalEditarCli(false); setClienteEditando(null); }} className="text-neutral-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={guardarEdicionCliente} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Nombre del Cliente</label>
                <input type="text" required value={cliNom} onChange={(e) => setCliNom(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-600 shadow-inner" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">WhatsApp</label>
                <input type="text" required value={cliNum} onChange={(e) => setCliNum(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-600 shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Fecha Inicio</label>
                  <input 
                    type="date" 
                    required 
                    value={cliInicio} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setCliInicio(val);
                      if (val) {
                        const [yy, mm, dd] = val.split('-');
                        const dateObj = new Date(parseInt(yy), parseInt(mm) - 1, parseInt(dd));
                        dateObj.setMonth(dateObj.getMonth() + 1);
                        const nY = dateObj.getFullYear();
                        const nM = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const nD = String(dateObj.getDate()).padStart(2, '0');
                        setCliFin(`${nY}-${nM}-${nD}`);
                      }
                    }} 
                    className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-600 shadow-inner" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Fecha Fin</label>
                  <input type="date" required value={cliFin} onChange={(e) => setCliFin(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-600 shadow-inner" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button type="button" onClick={() => { setModalEditarCli(false); setClienteEditando(null); }} className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-950">Guardar Cambios</button>
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
              <h3 className="text-xl font-extrabold text-white">Asignar Cliente</h3>
              <button onClick={cerrarModalCli} className="text-neutral-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="bg-[#140a0a] p-4 rounded-xl border border-red-900/30 mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1.5 block">¿Es un cliente registrado?</label>
              <select 
                className="w-full bg-[#050505] border border-red-900/50 rounded-xl p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-red-600"
                onChange={(e) => {
                  if(e.target.value === "") {
                    setCliNom('');
                    setCliNum('');
                    return;
                  }
                  const seleccionado = clientesUnicos.find(c => c.whatsapp === e.target.value);
                  if(seleccionado) {
                    setCliNom(seleccionado.nombre);
                    setCliNum(seleccionado.whatsapp);
                  }
                }}
              >
                <option value="">-- Crear Nuevo Cliente (Escribir datos abajo) --</option>
                {clientesUnicos.map((c, idx) => (
                  <option key={idx} value={c.whatsapp}>{c.nombre} ({c.whatsapp})</option>
                ))}
              </select>
            </div>

            <form onSubmit={guardarClienteNuevo} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Nombre del Cliente</label>
                <input type="text" required value={cliNom} onChange={(e) => setCliNom(e.target.value)} placeholder="Nombre completo" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">WhatsApp</label>
                <input type="text" required value={cliNum} onChange={(e) => setCliNum(e.target.value)} placeholder="Ej. 987654321" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
              </div>
              
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block flex items-center justify-between">
                  Cuentas a Asignar
                  <span className="text-[10px] text-neutral-500 font-normal normal-case">Pega varios correos a la vez</span>
                </label>
                <textarea 
                  required 
                  rows="3"
                  value={cliCuentaAsignada} 
                  onChange={(e) => setCliCuentaAsignada(e.target.value)} 
                  placeholder="Pega aquí todo el texto que copiaste de Ventas Rápidas..."
                  className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner resize-none font-mono"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Fecha Inicio</label>
                  <input 
                    type="date" 
                    required 
                    value={cliInicio} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setCliInicio(val);
                      if (val) {
                        const [yy, mm, dd] = val.split('-');
                        const dateObj = new Date(parseInt(yy), parseInt(mm) - 1, parseInt(dd));
                        dateObj.setMonth(dateObj.getMonth() + 1);
                        const nY = dateObj.getFullYear();
                        const nM = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const nD = String(dateObj.getDate()).padStart(2, '0');
                        setCliFin(`${nY}-${nM}-${nD}`);
                      }
                    }} 
                    className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Fecha Fin</label>
                  <input type="date" required value={cliFin} onChange={(e) => setCliFin(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Estado de Pago</label>
                <select value={cliPago} onChange={(e) => setCliPago(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-bold focus:ring-2 focus:ring-red-600 shadow-inner">
                  <option value="Pagado">✅ Pagado</option>
                  <option value="Pendiente">❌ Pendiente</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button type="button" onClick={cerrarModalCli} className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950">Guardar Asignaciones</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GASTOS */}
      {modalCaja && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] border border-[#3b0909] rounded-3xl w-full max-w-md p-8 space-y-5 shadow-2xl shadow-red-950">
            <div className="flex justify-between items-center border-b border-[#2b0d0d] pb-4">
              <h3 className="text-xl font-extrabold text-white">Control de Gastos</h3>
              <button onClick={() => setModalCaja(false)} className="text-neutral-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={guardarTransaccion} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Categoría del Gasto</label>
                <select value={gastoCategoria} onChange={(e) => setGastoCategoria(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-bold focus:ring-2 focus:ring-red-600 shadow-inner">
                  <option value="Comida">🍔 Comida</option>
                  <option value="Pasajes">🚗 Pasajes</option>
                  <option value="Detalles">🎁 Detalles</option>
                  <option value="Otros">📦 Otros</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Concepto o Detalle</label>
                <input type="text" required value={gastoConcepto} onChange={(e) => setGastoConcepto(e.target.value)} placeholder="Ej. Almuerzo con equipo" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Monto (Soles)</label>
                <input type="number" step="0.01" required value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} placeholder="0.00" className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600 shadow-inner" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">Tipo de Transacción</label>
                <select value={gastoTipo} onChange={(e) => setGastoTipo(e.target.value)} className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-3 text-sm text-white outline-none font-bold focus:ring-2 focus:ring-red-600 shadow-inner">
                  <option value="Egreso">🔻 Egreso (Gasto)</option>
                  <option value="Ingreso">🔺 Ingreso Extra</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b0d0d]">
                <button type="button" onClick={() => setModalCaja(false)} className="px-5 py-2.5 text-neutral-400 hover:text-white text-sm font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#800f11] to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BotonesMenu({ icono, texto, vista, vistaActual, setVista }) {
  const activo = vistaActual === vista;
  return (
    <button onClick={() => setVista(vista)} className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 ${activo ? 'bg-gradient-to-r from-[#800f11] to-red-600 text-white shadow-lg shadow-red-950 font-bold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 font-medium'}`}>
      {icono}
      <span className="text-sm tracking-wide">{texto}</span>
    </button>
  );
}

function BotonMobile({ icono, texto, vista, vistaActual, setVista }) {
  const activo = vistaActual === vista;
  return (
    <button onClick={() => setVista(vista)} className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${activo ? 'text-red-500 font-bold scale-105' : 'text-neutral-400 hover:text-neutral-200 font-medium'}`}>
      {icono}
      <span className="text-[10px] tracking-tight mt-1">{texto}</span>
    </button>
  );
}