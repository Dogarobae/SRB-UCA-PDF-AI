# UCA AI — B-E 1.03.2

**Lector local de documentos PDF para entrega académica.**  
**SRB powered this AI.**

`B-E` significa **Beta-Escolarizada**: una rama separada y reducida para la entrega universitaria.

Esta edición fue separada del proyecto operativo principal y reducida a la función
solicitada para la actividad escolar: cargar un PDF y contestar preguntas sobre su
contenido mediante un modelo ejecutado localmente con Ollama.

## Qué hace

1. Recibe un PDF de hasta 20 MB.
2. Extrae el texto disponible por página.
3. Utiliza visión local en páginas escaneadas, tablas, diagramas o gráficas cuando
   el texto nativo no es suficiente.
4. Fragmenta e indexa el contenido.
5. Recupera los fragmentos relevantes para cada pregunta.
6. Envía únicamente ese contexto al modelo local `qwen3-vl:2b-instruct`.

El sistema **no reentrena** el modelo con cada PDF. Utiliza recuperación documental
local, un flujo equivalente a RAG, para responder con el contenido del archivo.

## Privacidad y funcionamiento sin internet

Durante el uso normal, la interfaz, el backend, Ollama, las conversaciones y los PDF
funcionan en el mismo equipo. Los datos se guardan en `data/` y no se envían a un
servicio externo.

La instalación inicial de dependencias y la descarga del modelo sí requieren
internet. Después de instalar todo, `iniciar.bat` puede utilizarse sin conexión.

## Requisitos

- Windows 10 u 11.
- Node.js 22.13.0 o posterior.
- Ollama 0.12.7 o posterior.
- Aproximadamente 2 GB libres para el modelo, además de las dependencias.

## Instalación

1. Extrae el ZIP completo.
2. Ejecuta `instalar.bat`.
3. Espera a que se instalen las dependencias y el modelo.
4. Ejecuta `iniciar.bat`.
5. Abre `http://127.0.0.1:3000`.

## Archivos principales

```text
config/uca_policy.js       Reglas académicas y documentales del asistente
config/attribution.js      Verificación criptográfica de la entrega
lib/pdf_documents.js       Extracción, visión, fragmentación y recuperación
public/                    Interfaz web
server.js                  Backend local Node.js/Express
data/                      Chats y PDF almacenados localmente
integrity/                 Manifiesto firmado y firma de integridad
```

## Atribución e integridad

La interfaz muestra la firma **“SRB powered this AI.”** y la aplicación valida al
arrancar un manifiesto Ed25519 con hashes SHA-256 de los archivos protegidos. La
clave privada de firma no se incluye en la entrega.

Cuando se entrega código fuente completo, ninguna marca puede ser técnicamente
imposible de remover por una persona que también modifique el verificador. Esta
edición hace que los cambios ordinarios sean detectables y que la compilación
original no arranque si se altera un archivo protegido. Las condiciones de uso se
encuentran en `LICENSE-ESCOLAR.md` y `NOTICE-SRB.txt`.

## Comandos útiles

```bat
npm test
npm run verify
iniciar.bat
```

Variables opcionales:

```text
UCA_HOST=127.0.0.1
UCA_PORT=3000
UCA_MODEL=qwen3-vl:2b-instruct
UCA_NUM_CTX=4096
UCA_KEEP_ALIVE=2m
UCA_MAX_VISION_PAGES=20
UCA_PDF_RENDER_SCALE=1.6
```
