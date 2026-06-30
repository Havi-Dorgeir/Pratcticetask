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
//renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.2;
//renderer.outputColorSpace = THREE.SRGBColorSpace;

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



  const pillars = [];
const groups = [];
const pillarPairs = [];



let model;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const loader = new GLTFLoader();
loader.load("/model/pilars.gltf", function (glb) {
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
    glb.scene.traverse((obj) => {
    console.log(obj.name, obj.type);
});
const groups = [
    glb.scene.getObjectByName("Group1"),
    glb.scene.getObjectByName("Group2"),
    glb.scene.getObjectByName("Group3"),
];


 console.log(groups[1]);
    model.traverse((child) => {
        if (child.isLight) {
            child.intensity *= 0.33;
            child.castShadow = true;
        }
    });

 //console.log(pillars[0].ge);

groups.forEach(group => {
    if (group) {
       
        group.traverse(obj => {
            if (obj.isMesh) {
                 const keys = obj.name.replace(/_1$/,"");
                 if (!pillarPairs[keys]) {
                    pillarPairs[keys]=[];
                 }

                 pillarPairs[keys].push(obj);
                pillars.push(obj);


               
                obj.userData.hover = 0;
                obj.userData.targetHover = 0;
                obj.userData.baseY = obj.position.y; 
                obj.userData.groupkeys = keys;
            }
        });
    }
});

console.log(pillars);
   


pillars.forEach(pillar => {
    pillar.userData.hover = 0;
    pillar.userData.targetHover = 0;
});

 
model.traverse((obj) =>{
    if (obj.isMesh) {
        console.log(obj.name);
        console.log(obj.material);
    }
});

pillars.forEach( p => {
    console.log(p.name, p.userData.baseY);
})

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
            } else if (clip.name === 'idleAnimation') {
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

   

    
    
   
});


// --- Частицы ---

// --- Частицы ---


// --- Движение мышкой ---
window.addEventListener("mousemove", (e) =>{
    mouse.x = (e.clientX / window.innerWidth) * 2 -1;
    mouse.y = -(e.clientY / window.innerHeight) *2 +1;
    
});

let  intersects = [];
// --- Движение мышкой ---



window.addEventListener("scroll", () => {
    if (scrollActions.length === 0) return;

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


   

   

    const elapsedTime = clock.getElapsedTime();
    const activeCamera = blenderCamera ? blenderCamera : camera;



    if (!blenderCamera) {
        controls.update();
    }

    raycaster.setFromCamera(mouse, blenderCamera || camera);
    intersects = raycaster.intersectObjects(pillars);

    pillars.forEach( p => p.userData.targetHover = 0);


    if (intersects.length > 0) {
        const key = intersects[0].object.userData.groupkeys;

        pillarPairs[key].forEach(mesh=>{
            mesh.userData.targetHover = 1;

        });
        console.log(intersects[0].object.name
);
    }
pillars.forEach(pillar => {
        pillar.userData.hover += (pillar.userData.targetHover - pillar.userData.hover) * 0.55;
        pillar.position.y = pillar.userData.baseY + (pillar.userData.hover * 9.9);
    });
   

    
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