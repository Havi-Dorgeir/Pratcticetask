precision highp float;

uniform float uTime;
uniform vec3 uWaterColor;   // Глубокий цвет воды
uniform vec3 uShallowColor; // Цвет на поверхности/мелководье

varying vec3 vNormal;       // Нормаль меша (из вершинного шейдера)
varying vec3 vViewPosition; // Позиция камеры относительно точки (нужно передать из vertex)
varying vec2 vWorldXZ;

// Простая функция плавного шума для волн
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

void main()
{
    // 1. Создаем движение волн, смешивая два слоя шума на разной скорости
    vec2 uv = vWorldXZ * 0.1;
    float waveA = noise(uv + vec2(uTime * 0.02, uTime * 0.01));
    float waveB = noise(uv * 2.0 - vec2(uTime * 0.01, uTime * 0.03));
    float waveFinal = (waveA + waveB) * 0.5;

    // 2. Расчет эффекта Френеля (зависимость прозрачности от угла взгляда)
    // Нормализуем вектор взгляда камеры и нормаль поверхности
    vec3 normal = normalize(vNormal);
    
    // Вектор от точки на воде к камере (предполагаем, что камера вверху)
    // Для идеального расчета viewDir нужно передавать из Vertex Shader
    vec3 viewDir = normalize(vec3(0.0, 1.0, 0.5)); 
    
    // Косинус угла между взглядом и нормалью
    float fresnel = dot(viewDir, normal);
    // Инвертируем и возводим в степень для контраста
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    fresnel = pow(fresnel, 3.0); // Чем выше степень, тем прозрачнее вода при взгляде сверху

    // 3. Смешиваем цвета воды
    // В местах, где волны выше — цвет чуть светлее
    vec3 baseColor = mix(uWaterColor, uShallowColor, waveFinal * 0.4);
    
    // Добавим легкие белые блики на гребнях волн
    float foam = smoothstep(0.6, 0.8, waveFinal);
    baseColor = mix(baseColor, vec3(1.0), foam * 0.3);

    // 4. Прозрачность (Alpha)
    // Базовая прозрачность воды + увеличиваем непрозрачность под углом (Френель)
    float alpha = mix(0.4, 0.9, fresnel); 

    gl_FragColor = vec4(baseColor, alpha);
}