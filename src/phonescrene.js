import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import WaterFragmentShader from "./water_fragment_shader.glsl?raw";
import WaterVertexShader from "./water_vertex_shader.glsl?raw";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass, ShaderPass } from "three/examples/jsm/Addons.js";





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

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = true;

let cameraX = 0, cameraY = 55.5, cameraZ = -60.0;
camera.position.set(cameraX, cameraY, cameraZ);
const targetPosition = new THREE.Vector3(0, -5.4, -200.0);
camera.lookAt(targetPosition);
controls.target.copy(targetPosition);
const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(new RenderPass(scene, camera));
bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.05, 0.5, 0.0));
const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(new RenderPass(scene, camera));



// ---  ОСВЕЩЕНИЕ ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
hemiLight.position.set(0, 20, 0);
//scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(10, 10, 10);
////scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x90b0d0, 0.8);
fillLight.position.set(-10, 5, -15);
//scene.add(fillLight);
// --------------------

let mixer;
let blenderCamera = null;

let scrollActions = [];
let idleActions = [];
let targetScrollTime = 0;
let currentScrollTime = 0;

  let liquidMesh;

let model;

const waterMaterial = new THREE.ShaderMaterial({
   
    uniforms: {
    uTime:  { value: 0.0 },
    uDeep:  { value: new THREE.Color('#b1eaf7') },
    uMid:   { value: new THREE.Color('#dddbe9') },
    uCrest: { value: new THREE.Color('#35eded') }, 
    },
    
   
    vertexShader: WaterVertexShader,
    fragmentShader: WaterFragmentShader,
    
    
    transparent: true,
    depthWrite: false, 
    depthTest: true
});
const loader = new GLTFLoader();
loader.load("/model/PHONE.gltf", function (glb) {
    model = glb.scene;
    scene.add(model);

    if (glb.cameras && glb.cameras.length > 0) {
        blenderCamera = glb.cameras[0];
        blenderCamera.aspect = window.innerWidth / window.innerHeight;
        blenderCamera.updateProjectionMatrix();
    }

    if (glb.animations && glb.animations.length > 0) {
        console.log("=== Список доступных анимаций в модели ===");
        glb.animations.forEach((anim, index) => {
            console.log(`[${index}] Имя: "${anim.name}" | Длительность: ${anim.duration.toFixed(2)} сек.`);
        });
        console.log("==========================================");

        mixer = new THREE.AnimationMixer(model);

        glb.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);

            if (clip.name === 'ScrollAnimation') {

                action.blendMode = THREE.NormalBlending;
                action.play();
                action.paused = true;

                action.setEffectiveWeight(1.0);
                scrollActions.push(action);

            } 
        });
          liquidMesh = model.getObjectByName("Liquid");
          console.log("liquidMesh:", liquidMesh);
console.log("layers:", liquidMesh?.layers.mask);
           liquidMesh.traverse((child) => {
      if (child.isMesh) {
         child.material = waterMaterial;
         child.layers.enable(1); 
      }
    });

    }

    const box = new THREE.Box3().setFromObject(model);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.5;
    camera.position.set(center.x, center.y + (maxDim * 0.5), center.z + cameraZDistance);
    camera.lookAt(center);
    controls.update();
});


let coor = new THREE.Vector2(0, 0);


window.addEventListener("scroll", () => {
    if (scrollActions.length == 0) {
        return;
    }
    const clipDuration = scrollActions[0].getClip().duration;
    const scrollY = window.scrollY;

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    const scrollPercent = maxScroll > 0 ? scrollY / maxScroll : 0;

    targetScrollTime = scrollPercent * clipDuration;
    console.log(`Прокрутка: ${scrollY}px | Процент: ${(scrollPercent * 100).toFixed(1)}%`);
    console.log("renderTarget2:", bloomComposer.renderTarget2);
console.log("renderTargetB:", bloomComposer.renderTargetB);
});
 const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const originalMaterials = new Map();
const clock = new THREE.Clock();

const mixPass = new ShaderPass({
    uniforms: {
        baseTexture:  { value: null },
        bloomTexture: { value: null }  
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
        void main() { gl_FragColor = texture2D(baseTexture, vUv) + vec4(texture2D(bloomTexture, vUv).rgb, 0.0); }`
}, "baseTexture");

mixPass.needsSwap = true;
finalComposer.addPass(mixPass);
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (mixer) mixer.update(delta);
    if (waterMaterial) waterMaterial.uniforms.uTime.value = elapsedTime;

    if (scrollActions.length > 0) {
        currentScrollTime += (targetScrollTime - currentScrollTime) * 0.1;
        scrollActions.forEach((action) => {
            action.time = currentScrollTime;
            action.setEffectiveWeight(1.0);
        });
    }

    const isScrolledDown = targetScrollTime > 0.001 || currentScrollTime > 0.001;
    idleActions.forEach((action) => {
        if (isScrolledDown) { action.setEffectiveWeight(0.0); action.stop(); }
        else { if (!action.isRunning()) action.play(); action.setEffectiveWeight(1.0); }
    });

    const activeCamera = blenderCamera ?? camera;
    if (!blenderCamera) controls.update();

    bloomComposer.passes[0].camera = activeCamera;
    finalComposer.passes[0].camera = activeCamera;

   
    

    // 2. рендерим bloom в текстуру
    
    

    // 4. финальный рендер — один раз, в самом конце
     renderer.render(scene, activeCamera);
}
animate();

window.addEventListener("resize", function () {
    const aspect = window.innerWidth / window.innerHeight;
    if (blenderCamera) {
        blenderCamera.aspect = aspect;
        blenderCamera.updateProjectionMatrix();
    }
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
finalComposer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});