uniform float uTime;
varying float vHeight;
varying vec3  vNormal;
varying vec2 vWorldXZ;
float getWaveY(float x, float z, float time)
{
    float uFreqX = 0.2;
    float uFreqZ = 0.05;
    float uSpeed = 0.5;
    float uAmp   = 55.0;

    float waveX = sin(x * uFreqX + time * uSpeed);
    float waveZ = sin(z * uFreqZ + time * uSpeed * 0.5);
    return (waveX + waveZ) * uAmp;
}

void main() {
     float eps = 0.01;
    vec3 pos = position;
    
    
    pos.y  = getWaveY(pos.x, pos.z, uTime);
    //pos.x = sin(pos.y * 1.0) *0.5;
    vHeight = pos.y * 1096.6;
    float hL = getWaveY(pos.x - eps, pos.z, uTime);
    float hR = getWaveY(pos.x + eps, pos.z, uTime);
    float hD = getWaveY(pos.x, pos.z - eps, uTime);
    float hU = getWaveY(pos.x, pos.z + eps, uTime);
vec3 tangentX = normalize(vec3(2.0 * eps, hR - hL, 0.0));
vec3 tangentZ = normalize(vec3(0.0, hU - hD, 2.0 * eps));

// нормаль = перекрёстное произведение касательных
vNormal = normalize(cross(tangentZ, tangentX));
vWorldXZ = position.xz; ;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}