import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";




const canvasElement = document.getElementById("bg");


const renderer = new THREE.WebGLRenderer({ 
  canvas: canvasElement,
  antialias: true 
});



renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;



const scene = new THREE.Scene();


scene.background = new THREE.Color("#bcccd4");
scene.fog = new THREE.FogExp2("#bcccd4", 0.012);
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = false;
let cameraY = 55.5;
let cameraX = 0;
let cameraZ = -60.0;


camera.position.set(cameraX, cameraY, cameraZ);



const targenposition = new THREE.Vector3(0, -5.4, -200.0); 


camera.lookAt(targenposition);
controls.target.copy(targenposition);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 5, -15);
scene.add(directionalLight);


const loader = new GLTFLoader();
let liquidMesh;
let waterMaterial;
loader.load("/model/first.glb", function (glb) {
  const model = glb.scene;
  scene.add(model);
  model.position.set(0, -2.4, 11);

  const sphereMesh = model.getObjectByName("Sphere");
  if (sphereMesh) {
    sphereMesh.material = new THREE.MeshStandardMaterial({
      color: 0xffe57f,        
      emissive: 0xffa500,     
      emissiveIntensity: 4.5,
      fog: false  
    });
  } else {
    console.warn("Объект с именем 'Sphere' не найден");
  }

  
  const ellipseMesh = model.getObjectByName("Ellipse");
  if (ellipseMesh) {
    const glowMaterial = new THREE.ShaderMaterial({
      fog: false,
      uniforms: {
        colorCenter: { value: new THREE.Color("#ffd700") }, 
        colorEdge: { value: new THREE.Color("#7b25b8") }    
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.9);
        }
      `,
      fragmentShader: `
        uniform vec3 colorCenter;
        uniform vec3 colorEdge;
        varying vec2 vUv;
        void main() {
         
          float dist = distance(vUv, vec2(0.5, 0.43));
          
          
          float alpha = smoothstep(0.4, 0.3, dist);
          
         
          float colorFactor = smoothstep(0.0, 0.4, dist);
          vec3 finalColor = mix(colorCenter, colorEdge, colorFactor);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    ellipseMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = glowMaterial;
      }
    });
  } else {
    console.warn("Объект с именем 'Ellipse' не найден");
  }

 
  model.traverse((child) => {
    if (child.isMesh) {
      // Исключаем Сферу, Воду и Эллипс из общего перекрашивания
      if (child.name !== "Sphere" && 
          child.name !== "Ellipse" && 
          child.name !== "Liquid" && 
          !child.parent?.name.includes("Ellipse")) {
        
        child.material = new THREE.MeshStandardMaterial({
          color: 0x768d9c,          // Твой мягкий серо-синий тон
          roughness: 0.6,           // Матовая текстура для мягкого рассеивания света
          metalness: 0.1            // Минимальный металл, чтобы сохранить пастельность
        });
      }
    }
  });

  
  liquidMesh = model.getObjectByName("Liquid");
  if (liquidMesh) {
    
    waterMaterial = new THREE.ShaderMaterial({
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          colorDark:      { value: new THREE.Color("#4b89a8") },
          colorLight:     { value: new THREE.Color("#63a9cc") },
          colorHighlight: { value: new THREE.Color("#8dbdd7") },
          w_time:         { value: 0.0 },
          noiseScale:     { value: 0.29 }, 
          noiseSpeed:     { value: 0.1 }   
        }
      ]),
      vertexShader: `
        #include <fog_pars_vertex>
        uniform float w_time;
        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.y += sin(pos.x * 4.0 + w_time * 2.0) * 0.1;

          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPosition.xyz;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vViewPosition = -mvPosition.xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        uniform vec3 colorDark;
        uniform vec3 colorLight;
        uniform vec3 colorHighlight;
        uniform float w_time;
        uniform float noiseScale;
        uniform float noiseSpeed;
        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        #include <fog_pars_fragment>

        
        vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
        vec2 fade(vec2 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }

        float cnoise(vec2 P){
          vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
          vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
          Pi = mod289(Pi);
          vec4 ix = Pi.xzxz;
          vec4 iy = Pi.yyww;
          vec4 fx = Pf.xzxz;
          vec4 fy = Pf.yyww;

          vec4 i = permute(permute(ix) + iy);

          vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
          vec4 gy = abs(gx) - 0.5;
          vec4 tx = floor(gx + 0.5);
          gx = gx - tx;

          vec2 g00 = vec2(gx.x, gy.x);
          vec2 g10 = vec2(gx.y, gy.y);
          vec2 g01 = vec2(gx.z, gy.z);
          vec2 g11 = vec2(gx.w, gy.w);

          vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
          g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;

          float n00 = dot(g00, vec2(fx.x, fy.x));
          float n10 = dot(g10, vec2(fx.y, fy.y));
          float n01 = dot(g01, vec2(fx.z, fy.z));
          float n11 = dot(g11, vec2(fx.w, fy.w));

          vec2 fade_xy = fade(Pf.xy);
          vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
          float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
          return 2.3 * n_xy;
        }

        void main() {
  float depthFactor = clamp((vWorldPosition.z + 200.0) / 400.0, 0.0, 1.0);
  vec3 baseColor = mix(colorDark, colorLight, depthFactor);

  
  float n1 = cnoise(vWorldPosition.xz * noiseScale + w_time * noiseSpeed);
  float n2 = cnoise(vWorldPosition.xz * noiseScale * 3.5 - w_time * noiseSpeed * 1.6);
  float n = n1 * 0.6 + n2 * 0.4;
  n = n * 0.5 + 0.5;

  
  float spots = smoothstep(0.55, 0.6, n);

  vec3 finalColor = mix(baseColor, colorHighlight, spots);

  gl_FragColor = vec4(finalColor, 1.0);
  float fogDepth = length(vViewPosition);
  #include <fog_fragment>
}
      `,
      transparent: true,
    });

    
    liquidMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = waterMaterial;
      }
    });
  } else {
    console.warn("Объект с именем 'Liquid' не найден");
  }
});

 
 
 /*
function moveCamera() {


    const t = document.body.getBoundingClientRect().top;
    const s = -t;

    console.log("scroll:", s);

    const progress = Math.min(s / 1500, 1);

    console.log("progress:", progress);

    const dropProgress =
        1 - Math.pow(1 - progress, 4);

    camera.position.y =
        THREE.MathUtils.lerp(
            55.5,
            -1,
            dropProgress
        );

    camera.position.z =
        THREE.MathUtils.lerp(
            -60,
            600,
            progress
        );

    controls.target.lerpVectors(
        new THREE.Vector3(0, -5.4, -200),
        new THREE.Vector3(0, -1, 3000),
        progress
    );
}

*/
const START_Y = 55.5;
const END_Y   = -15.583817596354278;

const START_Z = -60.0;
const END_Z   = -376.37660554321184;

let targetProgress = 0;
let currentProgress = 0;

function updateScrollTarget() {
  const t = document.body.getBoundingClientRect().top;
  const s = Math.max(-t, 0);
  targetProgress = Math.min(s / 1500, 1);
}
window.addEventListener("scroll", updateScrollTarget);
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
updateScrollTarget();
currentProgress = targetProgress;

function moveCamera() {
  currentProgress = THREE.MathUtils.lerp(currentProgress, targetProgress, 0.08);

  const dropEase = 1 - Math.pow(1 - currentProgress, 4); 
  const forwardEase = currentProgress * currentProgress;  

  camera.position.y = THREE.MathUtils.lerp(START_Y, END_Y, dropEase);
  camera.position.z = THREE.MathUtils.lerp(START_Z, END_Z, forwardEase);

  controls.target.lerpVectors(
    new THREE.Vector3(0, -5.4, -200),
    new THREE.Vector3(0, END_Y - 10, END_Z - 100),
    forwardEase
  );
}





document.body.onscroll = moveCamera;

function animate() {

  controls.update();
  if (waterMaterial) {
  waterMaterial.uniforms.w_time.value =
      clock.getElapsedTime();
}
  /*
    console.log(`з`)
    
  console.log(`${camera.position.z}`)
console.log(`--------------------------------------------------------------`)
console.log(`у`)
console.log(`${camera.position.y}`)
*/
  //moveCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
window.addEventListener("resize", function () {

  camera.aspect = window.innerWidth / (window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight );
});