import { useState } from 'react';
import { ShieldAlert, CheckCircle2, ShieldCheck, Camera, Fingerprint } from 'lucide-react';
import pruebaImg from '../prueba.jpg';

type FlowState = 'dashboard' | 'friction' | 'nexus-processing' | 'success';

const MOCK_FACE_URL = pruebaImg;

export default function NexusFlow() {
  const [flow, setFlow] = useState<FlowState>('dashboard');
  const [logs, setLogs] = useState<string[]>([]);

  const handleAuthorize = () => {
    setFlow('friction');
  };

  const handleStartNexus = () => {
    setFlow('nexus-processing');
    simulateProcessing();
  };

  const simulateProcessing = () => {
    const sequence = [
      '[OK] Balance de blancos ajustado...',
      '[OK] Ruido reducido...',
      '[OK] Paquete enviado a pasarela KYC'
    ];

    let i = 0;
    setLogs([]);
    const interval = setInterval(() => {
      const currentMsg = sequence[i];
      setLogs(prev => [...prev, currentMsg]);
      i++;
      if (i === sequence.length) {
        clearInterval(interval);
        setTimeout(() => setFlow('success'), 1000);
      }
    }, 800);
  };

  return (
    <div className="nexus-container">
      {/* Flujo 1: Dashboard y Fricción */}
      {flow === 'dashboard' && (
        <div className="flow-content animate-fade">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={20} />
            <span>Módulo de Pagos Soberano</span>
          </div>
          <div className="dashboard-balance">
            <span>Saldo Disponible</span>
            <h2>$ 1,250.00</h2>
            <span style={{ color: 'var(--success)' }}>USDT/BSC</span>
          </div>
          <p style={{ textAlign: 'center', marginBottom: '24px' }}>
            Listo para procesar transacción P2P.
          </p>
          <button className="btn" onClick={handleAuthorize}>
            Autorizar Retiro
          </button>
        </div>
      )}

      {/* Modal de Fricción */}
      {flow === 'friction' && (
        <div className="flow-content animate-fade">
          <div className="dashboard-balance" style={{ filter: 'blur(4px)', opacity: 0.5 }}>
            <h2>$ 1,250.00</h2>
          </div>
          <div className="modal-overlay">
            <div className="modal">
              <ShieldAlert size={48} className="modal-icon" style={{ margin: '0 auto 16px' }} />
              <h3>Requerimiento de Seguridad</h3>
              <p style={{ margin: '16px 0', fontStyle: 'italic' }}>
                "Requerimiento de Seguridad: Validación Biométrica Necesaria. Entorno detectado: Iluminación deficiente. Activando Middleware NEXUS..."
              </p>
              <button className="btn" onClick={handleStartNexus}>
                Iniciar NEXUS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flujo 2: Intervención Soberana */}
      {flow === 'nexus-processing' && (
        <div className="flow-content animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>NEXUS Edge Validation</h3>
            <span style={{ fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }}></div>
              Procesando Local
            </span>
          </div>

          <div className="camera-container">
            <div className="camera-view">
              <div className="camera-label">
                <Camera size={14} /> RAW (Típico)
              </div>
              <img src={MOCK_FACE_URL} className="camera-image raw-filter" alt="Raw Camera" />
            </div>
            <div className="camera-view">
              <div className="camera-label" style={{ background: 'rgba(0, 240, 255, 0.2)', color: 'var(--accent)' }}>
                <Fingerprint size={14} /> NEXUS Opt.
              </div>
              <img src={MOCK_FACE_URL} className="camera-image nexus-filter" alt="Nexus Corrected" />
              <div className="scanner-line"></div>
            </div>
          </div>

          <div className="terminal">
            {logs.map((log, index) => (
              <div key={index} className="terminal-line">
                {log.startsWith('[OK]') || log.startsWith('[SUCCESS]')
                  ? <span style={{ color: 'var(--success)' }}>{log}</span>
                  : <span style={{ color: 'var(--text-secondary)' }}>{log}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flujo 3: Éxito */}
      {flow === 'success' && (
        <div className="flow-content animate-fade" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: 'var(--success)', marginBottom: '8px' }}>Liberación Exitosa</h2>

          <div className="receipt">
            <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', margin: 0 }}>
              "Identidad Confirmada (Latencia: 1.2s). Hash de transacción: 0x9a8b7... Retiro de fondos autorizado hacia cuenta destino"
            </p>
          </div>

          <button className="btn" onClick={() => setFlow('dashboard')} style={{ background: 'var(--success)', color: 'var(--bg-dark)', border: 'none', boxShadow: '0 0 15px rgba(0,255,136,0.3)' }}>
            Cerrar Módulo
          </button>
        </div>
      )}
    </div>
  );
}
