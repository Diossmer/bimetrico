# Plan MVP — Sistema NEXUS Biométrico

## Stack Definido

| Capa | Tecnología | Rol |
|---|---|---|
| **Frontend** | Vite + React + TypeScript (`bimetrico`) | Interceptor NEXUS, cámara, Edge Processing |
| **Backend** | Spring Boot 3.x + Java 21 | API KYC, validación, sesiones, almacenamiento |
| **Comunicación** | REST + JSON / WebSocket (opcional) | Frontend ↔ Backend |
| **Auth** | JWT (Spring Security) | Protección de endpoints |
| **Storage** | Base64 en BD / MinIO (opciones) | Capturas biométricas |

---

## Arquitectura General

```mermaid
graph TD
    CAM[🎥 Cámara del Usuario] --> FE

    subgraph FE["Frontend — bimetrico (Vite/React)"]
        UC[useCamera Hook\ngetUserMedia API]
        SPLIT[Pantalla Dividida\nRAW vs NEXUS]
        CANVAS[Canvas API\nManipulación de Píxeles]
        FILTER[CSS Filters\nbrightness · contrast]
        UC --> SPLIT
        SPLIT --> CANVAS
        SPLIT --> FILTER
    end

    subgraph BE["Backend — Spring Boot"]
        AUTH[Auth Controller\nJWT Login]
        KYC[KYC Controller\nValidar Captura]
        SESSION[Session Controller\nGestión de Sesiones]
        SERVICE[Biometric Service\nLógica de Negocio]
        REPO[Repository\nJPA + H2/PostgreSQL]
        AUTH --> SERVICE
        KYC --> SERVICE
        SESSION --> SERVICE
        SERVICE --> REPO
    end

    FE -->|POST /api/kyc/validate\nBase64 Frame| KYC
    FE -->|POST /api/auth/login| AUTH
    BE -->|{ status, score, token }| FE
```

---

## Fase 1 — Frontend (`bimetrico`) 

### 1.1 Hook de Cámara

Crear `/src/hooks/useCamera.ts`:

```typescript
// Encapsula getUserMedia, expone el stream y el ref del video
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      setError('Cámara no disponible');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  return { videoRef, stream, error, startCamera, stopCamera };
}
```

### 1.2 Pantalla Dividida — Canvas vs CSS Filter

```
┌────────────────────────────────────┐
│  RAW (Típico)  │  NEXUS Edge Opt.  │
│                │                   │
│  <video>       │  <canvas>         │
│  Sin filtros   │  Píxeles ajustados│
│                │  + scanner line   │
└────────────────────────────────────┘
```

**Estrategia de renderizado:**
- **Izquierda (`<video>`)**: Stream directo, sin procesar
- **Derecha (`<canvas>`)**: `requestAnimationFrame` dibuja frames del video y aplica manipulación de píxeles via `getImageData` / `putImageData`

```typescript
// Simulación Edge Processing en Canvas
const processFrame = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement) => {
  ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
  const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Balance de blancos: elevar canal azul levemente
    data[i]     = Math.min(255, data[i]     * 1.05); // R
    data[i + 1] = Math.min(255, data[i + 1] * 1.08); // G  
    data[i + 2] = Math.min(255, data[i + 2] * 1.15); // B
    // Reducción de ruido: suavizado simple
    data[i + 3] = 255; // Alpha
  }

  ctx.putImageData(imageData, 0, 0);
};
```

### 1.3 Captura y Envío al Backend

```typescript
// Tomar snapshot del canvas como Base64 y enviar al backend
const captureAndSend = async () => {
  const base64 = canvasRef.current!.toDataURL('image/jpeg', 0.85);
  const response = await fetch('/api/kyc/validate', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ imageBase64: base64, sessionId })
  });
  const result = await response.json();
  // { status: 'APPROVED' | 'REJECTED', score: 0.97, message: '...' }
};
```

### 1.4 Estructura de Archivos (Frontend)

```
bimetrico/src/
├── components/
│   ├── NexusFlow.tsx          ← ya existe, refactorizar
│   ├── CameraView.tsx         ← video RAW
│   ├── NexusCanvas.tsx        ← canvas procesado
│   └── TerminalLog.tsx        ← logs de procesamiento
├── hooks/
│   ├── useCamera.ts           ← stream de cámara
│   └── useNexusProcess.ts     ← lógica de procesamiento
├── services/
│   └── kycService.ts          ← llamadas al backend
└── types/
    └── kyc.types.ts           ← interfaces TypeScript
```

---

## Fase 2 — Backend (Spring Boot)

### 2.1 Inicialización del Proyecto

```bash
# Spring Initializr — estructura sugerida
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.3.0 \
  -d groupId=com.nexus \
  -d artifactId=nexus-backend \
  -d name=nexus-backend \
  -d dependencies=web,security,data-jpa,h2,lombok,validation \
  -d javaVersion=21 \
  -o nexus-backend.zip
```

### 2.2 Estructura de Paquetes

```
nexus-backend/src/main/java/com/nexus/
├── controller/
│   ├── AuthController.java         ← /api/auth/login
│   ├── KycController.java          ← /api/kyc/validate
│   └── SessionController.java      ← /api/sessions
├── service/
│   ├── BiometricService.java       ← lógica de validación
│   ├── JwtService.java             ← generación de tokens
│   └── SessionService.java
├── model/
│   ├── User.java
│   ├── KycSession.java             ← entidad JPA
│   └── BiometricCapture.java       ← captura + score
├── repository/
│   ├── UserRepository.java
│   └── KycSessionRepository.java
├── dto/
│   ├── LoginRequest.java
│   ├── LoginResponse.java
│   ├── KycValidateRequest.java     ← { imageBase64, sessionId }
│   └── KycValidateResponse.java    ← { status, score, message }
├── security/
│   ├── SecurityConfig.java
│   └── JwtAuthFilter.java
└── config/
    └── CorsConfig.java             ← habilitar frontend en localhost:5173
```

### 2.3 Endpoints REST

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/auth/login` | Login usuario, retorna JWT | ❌ Público |
| `POST` | `/api/kyc/validate` | Valida captura biométrica | ✅ JWT |
| `GET` | `/api/sessions/{id}` | Estado de sesión KYC | ✅ JWT |
| `GET` | `/api/sessions/history` | Historial de validaciones | ✅ JWT |
| `DELETE` | `/api/sessions/{id}` | Cancelar sesión activa | ✅ JWT |

### 2.4 Entidad Principal

```java
@Entity
@Data
@Builder
public class KycSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String userId;
    private String status;          // PENDING, PROCESSING, APPROVED, REJECTED
    private Double biometricScore;  // 0.0 - 1.0
    
    @Column(columnDefinition = "TEXT")
    private String imageBase64;     // captura procesada

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### 2.5 Lógica del Servicio Biométrico (MVP)

```java
@Service
public class BiometricService {

    public KycValidateResponse validate(KycValidateRequest request) {
        // MVP: Simular score biométrico con lógica determinista
        // En producción: llamar a SDK biométrico o modelo ML

        double score = simulateScore(request.getImageBase64());

        String status = score >= 0.75 ? "APPROVED" : "REJECTED";
        String message = score >= 0.75 
            ? "Identidad verificada por NEXUS Edge"
            : "Verificación fallida — condiciones insuficientes";

        // Persistir sesión
        KycSession session = KycSession.builder()
            .userId(request.getUserId())
            .status(status)
            .biometricScore(score)
            .imageBase64(request.getImageBase64())
            .createdAt(LocalDateTime.now())
            .build();
        sessionRepository.save(session);

        return new KycValidateResponse(session.getId(), status, score, message);
    }

    private double simulateScore(String base64) {
        // Simula score basado en longitud/entropía de la imagen
        int len = base64 != null ? base64.length() : 0;
        return Math.min(0.99, 0.65 + (len % 1000) / 3000.0);
    }
}
```

### 2.6 Configuración CORS

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")   // Vite dev server
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

---

## Fase 3 — Integración y Flujo Completo

```
Usuario abre bimetrico
       │
       ▼
[Login] → POST /api/auth/login → JWT Token
       │
       ▼
[Captura Cámara] → getUserMedia stream activo
       │
       ▼
[Pantalla Dividida]
  RAW <video>  |  NEXUS <canvas> (Edge Processing)
       │
       ▼
[Botón "Validar"] → canvas.toDataURL() → Base64
       │
       ▼
POST /api/kyc/validate { imageBase64, sessionId }
       │
       ▼
[Spring Boot] → BiometricService → score calculado
       │
       ▼
{ status: "APPROVED", score: 0.97 }
       │
       ▼
[Frontend] → flow === 'success' → ✅ Identidad Verificada
```

---

## Roadmap de Desarrollo

| Sprint | Tareas | Duración |
|---|---|---|
| **Sprint 1** | Hook `useCamera`, componentes `CameraView` + `NexusCanvas`, Split UI | 2-3 días |
| **Sprint 2** | Spring Boot base, Auth JWT, endpoint `/api/auth/login` | 2 días |
| **Sprint 3** | `KycController` + `BiometricService` + persistencia H2 | 2 días |
| **Sprint 4** | Integración frontend↔backend, CORS, servicio `kycService.ts` | 1-2 días |
| **Sprint 5** | Polish UI: animaciones, terminal logs, flujo `success` | 1-2 días |

> **Total estimado MVP funcional: ~10 días**

---

## Decisiones Técnicas Clave

> [!NOTE]
> **¿Canvas API o CSS Filters?** Para el MVP, CSS Filters (`filter: brightness(1.2) contrast(1.1)`) es suficiente y más rápido. Canvas API con `getImageData` es necesario solo si se quiere enviar la imagen "procesada" real al backend.

> [!IMPORTANT]
> **¿H2 o PostgreSQL?** Usar H2 en memoria para desarrollo local. Cambiar a PostgreSQL para producción simplemente actualizando `application.yml`.

> [!TIP]
> **Proxy de Vite**: Configura en `vite.config.ts` un proxy `/api → http://localhost:8080` para evitar problemas CORS durante desarrollo sin manejar headers manualmente.

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})
```
