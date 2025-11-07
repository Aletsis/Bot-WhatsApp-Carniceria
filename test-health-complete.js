import { spawn } from 'child_process';
import http from 'http';

let serverProcess;

// Función para probar el endpoint
function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data, error: 'JSON parse error' });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Función para esperar a que el servidor esté listo
function waitForServer(maxAttempts = 10, delayMs = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryConnect = () => {
      attempts++;
      
      testHealthEndpoint()
        .then(() => {
          console.log(`✅ Servidor listo después de ${attempts} intentos`);
          resolve();
        })
        .catch((err) => {
          if (attempts >= maxAttempts) {
            reject(new Error(`Servidor no responde después de ${maxAttempts} intentos`));
          } else {
            console.log(`⏳ Intento ${attempts}/${maxAttempts}...`);
            setTimeout(tryConnect, delayMs);
          }
        });
    };
    
    tryConnect();
  });
}

// Iniciar servidor
console.log('🚀 Iniciando servidor...\n');
serverProcess = spawn('node', ['app.js'], {
  stdio: 'inherit',
  shell: true
});

// Esperar a que el servidor esté listo
waitForServer()
  .then(() => {
    console.log('\n🧪 Probando endpoint /health...\n');
    return testHealthEndpoint();
  })
  .then((result) => {
    console.log('=== HEALTH CHECK RESPONSE ===');
    console.log('Status Code:', result.statusCode);
    console.log('Response:');
    console.log(JSON.stringify(result.data, null, 2));
    console.log('==============================\n');
    
    if (result.statusCode === 200 || result.statusCode === 503) {
      console.log('✅ Test PASSED: Endpoint respondió correctamente');
      
      // Verificar estructura de respuesta
      const data = result.data;
      const requiredFields = ['status', 'timestamp', 'uptime', 'services', 'system'];
      const hasAllFields = requiredFields.every(field => field in data);
      
      if (hasAllFields) {
        console.log('✅ Estructura de respuesta correcta');
        
        // Verificar servicios
        const requiredServices = ['database', 'whatsapp', 'disk', 'memory'];
        const hasAllServices = requiredServices.every(svc => svc in data.services);
        
        if (hasAllServices) {
          console.log('✅ Todos los servicios verificados');
          console.log('\n📊 Estado de servicios:');
          Object.entries(data.services).forEach(([name, service]) => {
            const icon = service.status === 'up' || service.status === 'ok' || service.status === 'configured' ? '✅' : '⚠️';
            console.log(`  ${icon} ${name}: ${service.status}`);
          });
        } else {
          console.log('⚠️ Faltan servicios en la respuesta');
        }
      } else {
        console.log('⚠️ Estructura de respuesta incompleta');
      }
    } else {
      console.log(`⚠️ Status code inesperado: ${result.statusCode}`);
    }
  })
  .catch((err) => {
    console.error('❌ Test FAILED:', err.message);
  })
  .finally(() => {
    console.log('\n🛑 Deteniendo servidor...');
    if (serverProcess) {
      serverProcess.kill();
    }
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrumpido');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(1);
});
