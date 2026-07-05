import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, CheckCircle2, ShieldCheck, Camera, Fingerprint } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

type FlowState = 'dashboard' | 'friction' | 'nexus-processing' | 'success';

export default function NexusFlow() {
  const [flow, setFlow] = useState<FlowState>('dashboard');
  const [logs, setLogs] = useState<string[]>([]);
  const { videoRef, stream, error, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [kycResult, setKycResult] = useState<any>(null);

  const handleAuthorize = () => {
    setFlow('friction');
  };

  const handleStartNexus = async () => {
    setFlow('nexus-processing');
    await startCamera();
    simulateProcessing();
  };

  useEffect(() => {
    let animationFrameId: number;
    
    if (flow === 'nexus-processing' && stream && videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const renderLoop = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            data[i]     = Math.min(255, data[i]     * 1.05); // R
            data[i + 1] = Math.min(255, data[i + 1] * 1.08); // G  
            data[i + 2] = Math.min(255, data[i + 2] * 1.15); // B
          }
          ctx.putImageData(imageData, 0, 0);
        }
        animationFrameId = requestAnimationFrame(renderLoop);
      };
      
      video.play();
      renderLoop();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [flow, stream, videoRef, canvasRef]);

  const simulateProcessing = async () => {
    setLogs(['Conectando con Backend NEXUS...']);
    
    // Prueba de conexión al Backend
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(prev => [...prev, `[SUCCESS] Conexión DB. Token: ${data.token.substring(0, 20)}...`]);
      } else {
        setLogs(prev => [...prev, '[ERROR] Fallo al conectar con backend']);
      }
    } catch (e) {
      setLogs(prev => [...prev, '[ERROR] Servidor backend apagado o inaccesible']);
    }

    const sequence = [
      '[OK] Capturando frame de video...',
      '[OK] Aplicando balance de blancos en Edge...',
      '[OK] Paquete biométrico enviado a pasarela KYC'
    ];

    let i = 0;
    const interval = setInterval(async () => {
      const currentMsg = sequence[i];
      setLogs(prev => [...prev, currentMsg]);
      i++;
      if (i === sequence.length) {
        clearInterval(interval);
        
        // Enviar la imagen al Backend KYC
        if (canvasRef.current) {
          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
          try {
            const res = await fetch('/api/kyc/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64 })
            });
            const kycData = await res.json();
            setKycResult(kycData);
            setLogs(prev => [...prev, `[SUCCESS] Identidad validada. Score: ${kycData.score}`]);
          } catch (err) {
            setLogs(prev => [...prev, '[ERROR] Fallo en la validación biométrica']);
          }
        }
        
        setTimeout(() => {
            stopCamera();
            setFlow('success');
        }, 1500);
      }
    }, 1500);
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
              {error ? (
                <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>{error}</div>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="camera-image" 
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>
            <div className="camera-view">
              <div className="camera-label" style={{ background: 'rgba(0, 240, 255, 0.2)', color: 'var(--accent)' }}>
                <Fingerprint size={14} /> NEXUS Opt.
              </div>
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={500} 
                className="camera-image nexus-filter"
                style={{ objectFit: 'cover' }}
              />
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
