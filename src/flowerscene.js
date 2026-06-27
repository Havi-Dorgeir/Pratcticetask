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

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = true;

let cameraX = 0, cameraY = 55.5, cameraZ = -60.0;
camera.position.set(cameraX, cameraY, cameraZ);
const targetPosition = new THREE.Vector3(0, -5.4, -200.0);
camera.lookAt(targetPosition);
controls.target.copy(targetPosition);

let mixer;
let blenderCamera = null;

let scrollActions = [];
let idleActions = [];
let targetScrollTime = 0;
let currentScrollTime = 0;

let model;
let hitboxes = [];
const loader = new GLTFLoader();
loader.load("/model/flowerglb.gltf", function (glb) {
    model = glb.scene;
    scene.add(model);

    if (glb.cameras && glb.cameras.length > 0) {
        blenderCamera = glb.cameras[0];
        blenderCamera.aspect = window.innerWidth / window.innerHeight;
        blenderCamera.updateProjectionMatrix();


        blenderCamera.updateWorldMatrix(true, false);
        const camWorldPos = new THREE.Vector3();
        blenderCamera.getWorldPosition(camWorldPos);


        //blenderCamera.add(particlesMesh);  
        //particlesMesh.position.set(0, -10, -10);


    }

    model.traverse((child) => {
        if (child.isLight) {
            child.intensity *= 0.33;
            child.castShadow = true;
        }
    });

    if (glb.animations && glb.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);

        glb.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);

            if (clip.name === 'ScrollAnimation') {
                action.blendMode = THREE.NormalBlending;
                action.play();
                action.paused = true;
                action.setEffectiveWeight(1.0);
                scrollActions.push(action);
            } else if (clip.name === 'IdleAnimation') {
                const action = mixer.clipAction(clip);
                action.blendMode = THREE.NormalBlending;
                action.setLoop(THREE.LoopRepeat);
                action.clampWhenFinished = false;
                action.play();
                action.setEffectiveWeight(1.0);
                idleActions.push(action);
            } else {
                action.play();
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


// --- Частицы ---

scene.background = new THREE.Color(0xffffff);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); 
//scene.add(ambientLight);
let isScrolling = false;
let scrollTimeout = null;
let idleWeight = 0; 
window.addEventListener("scroll", () => {
    if (scrollActions.length === 0) return;

    isScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isScrolling = false;
    },150);

    const clipDuration = scrollActions[0].getClip().duration;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = maxScroll > 0 ? scrollY / maxScroll : 0;
    targetScrollTime = scrollPercent * clipDuration;
});

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (mixer) {
        mixer.update(delta);
    }

    if (scrollActions.length > 0) {
        currentScrollTime += (targetScrollTime - currentScrollTime) * 0.1;
        scrollActions.forEach((action) => {
            action.time = currentScrollTime;
            action.setEffectiveWeight(1.0);
        });
    }

  if (idleActions.length > 0) {
    const targenWeight = isScrolling ? 0 :1;
    idleWeight += (targenWeight - idleWeight) * 0.05;
    idleActions.forEach((action) => {
        if (!action.isRunning()) {
            action.reset();
            action.play();
        }
        action.setEffectiveWeight(idleWeight);
    });
    scrollActions.forEach((action) =>{
    action.setEffectiveWeight(1.0);
});
}



    const elapsedTime = clock.getElapsedTime();
    const activeCamera = blenderCamera ? blenderCamera : camera;



    if (!blenderCamera) {
        controls.update();
    }

   
    renderer.render(scene, activeCamera);
}
animate();

window.addEventListener("resize", function () {
    const aspect = window.innerWidth / window.innerHeight;
    if (blenderCamera) {
        blenderCamera.aspect = aspect;
        blenderCamera.updateProjectionMatrix();
    }
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});