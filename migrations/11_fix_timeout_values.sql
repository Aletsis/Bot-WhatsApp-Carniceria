-- Script para corregir valores de timeout (convertir de milisegundos a minutos)

-- SESSION_TIMEOUT: 300000 ms = 5 minutos
UPDATE Configuraciones 
SET Valor = '5',
    Descripcion = 'Timeout de sesión en minutos (5 min default)'
WHERE Clave = 'SESSION_TIMEOUT';

-- CONVERSATION_TIMEOUT: 1800000 ms = 30 minutos  
UPDATE Configuraciones 
SET Valor = '30',
    Descripcion = 'Timeout de conversación en minutos (30 min default)'
WHERE Clave = 'CONVERSATION_TIMEOUT';

PRINT '✅ Valores de timeout actualizados a minutos';
GO
