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

// ---  ОСВЕЩЕНИЕ ---

// --------------------

let mixer;
let blenderCamera = null;

let scrollActions = [];
let idleActions = [];
let targetScrollTime = 0;
let currentScrollTime = 0;
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); 
//scene.add(ambientLight);

let model;
let hitboxes = [];
const loader = new GLTFLoader();
loader.load("/model/ai_all_states_copy68.gltf", function (glb) {
    model = glb.scene;
    scene.add(model);
    model.traverse((child) =>{
        if (child.isLight) {
            console.log("Найден свет из Blender:", child.name, "Интенсивность:", child.intensity);
            //child.intensity *= 20;
            child.castShadow = true;
        }

    });

    if (glb.cameras && glb.cameras.length > 0) {
        blenderCamera = glb.cameras[0];
        blenderCamera.aspect = window.innerWidth / window.innerHeight;
        blenderCamera.fov = 45;
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

            if (clip.name === 'ScrolAnimation') {

                action.blendMode = THREE.NormalBlending;
                action.play();
                action.paused = true;

                action.setEffectiveWeight(1.0);
                scrollActions.push(action);

            }  else {
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
    const isScrolledDown = targetScrollTime > 0.001 || currentScrollTime > 0.001;
    if (idleActions.length > 0) {
        idleActions.forEach((action) => {
            if (isScrolledDown) {
                action.setEffectiveWeight(0.0);
                action.stop();
            }
            else {
                if (!action.isRunning()) {
                    action.play();
                }
                action.setEffectiveWeight(1.0);
            }


        });
    }

    const activeCamera = blenderCamera ? blenderCamera : camera;
    if (hitboxes.length > 0) { 
        raycaster.setFromCamera(coor, activeCamera);
        
        const intersects = raycaster.intersectObjects(hitboxes, true);
        
        if (intersects.length > 0) {
            mouselight.position.copy(intersects[0].point);
            mouselight.position.addScaledVector(intersects[0].face.normal, 2.0);
        }
    }

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