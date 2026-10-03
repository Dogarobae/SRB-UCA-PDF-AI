# Guía breve de entrega

## Nombre del proyecto

UCA AI — Lector local de PDF  
Versión: B-E 1.03.2  
B-E: Beta-Escolarizada

## Explicación sugerida

La aplicación ejecuta un modelo de inteligencia artificial en Ollama dentro del
mismo equipo. Al cargar un PDF, el backend extrae su contenido, divide el texto en
fragmentos y recupera los fragmentos más relacionados con la pregunta. Las páginas
escaneadas pueden analizarse con el componente multimodal del mismo modelo.

No necesita internet durante la demostración una vez instalados Node.js, Ollama,
las dependencias y el modelo.

## Prueba de funcionamiento local

1. Ejecutar `iniciar.bat`.
2. Abrir `http://127.0.0.1:3000`.
3. Cargar un PDF.
4. Hacer una pregunta y mostrar la referencia de página.
5. Desactivar Wi-Fi.
6. Hacer una segunda pregunta.
7. Mostrar que la respuesta continúa funcionando.

## Firma de procedencia

SRB powered this AI.
