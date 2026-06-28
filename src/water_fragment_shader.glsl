precision highp float;

uniform float uTime;

uniform vec3 uColor;
varying float vHeight; 
varying vec3 vNormal;
varying vec2 vWorldXZ;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uCrest;
vec2 hash2 (vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// ─── Шум Вороного ─────────────────────────────────────────────────────────
// Возвращает: x = расстояние до ближайшей точки (F1)
//             y = расстояние до второй точки (F2)
vec3 voronoi(in vec2 p) {
    vec2  i_st = floor(p);
    vec2  f_st = fract(p);

    float m_dist1 = 0.7;  // F1 — расстояние до ближайшей
    float m_dist2 = 0.7;  
    vec2   m_id ;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2  neighbor = vec2(float(x), float(y));
            vec2  point    = hash2(i_st + neighbor);
            vec2  diff     = neighbor + point - f_st;
            float dist     = dot(diff, diff);  

            if (dist < m_dist1) {
                m_dist2 = m_dist1;
                m_dist1 = dist;
                m_id = i_st +  neighbor;
            } else if (dist < m_dist2) {
                m_dist2 = dist;
            }
        }
    }
    float id = hash2(m_id).x;

    return vec3(sqrt(m_dist1), sqrt(m_dist2), id);
}

void main()
{
    float cellSize = 0.005; 

    vec2 uv1 = vWorldXZ * cellSize;
    vec3 v1 = voronoi(uv1);
    
    // Слегка уменьшим безумный множитель 19.9 до 2.0, чтобы границы плит были аккуратнее
    vec2 uv2 = (vWorldXZ * (cellSize * 0.9) + v1.xy * 2.0);
    vec3 v2  = voronoi(uv2); // Убрали умножение на 15.0, мешающее адекватному расчету edge
    
    // Плавный анимированный шум для цвета внутри лавы
    vec2 uv  = vWorldXZ * cellSize + vec2(uTime * 0.005, uTime * 0.05);
    vec3 v = voronoi(uv);
    
    // Расстояние до края ячейки (0.0 — самый центр плиты, ~0.5+ — стыки между ними)
    float edge = v2.y - v2.x;
    
    // ИСПРАВЛЕНО: Теперь значение строго от 0.0 до 1.0. 
    // Настраивайте ширину трещин вторым параметром smoothstep (например, вместо 0.1 поставьте 0.05 или 0.2)
    float lava = 1.0 - smoothstep(0.0, 0.1, edge); 
    
    // Мягко смешиваем uMid и uCrest для самой лавы
    vec3 lavaColor = mix(uMid, uCrest, v.x); 
    
    // uDeep теперь является глубокой подложкой, uMid — цветом самой плиты
    vec3 baseColor = mix(uDeep, uMid, 0.2);
    
    // ИСПРАВЛЕНО: Так как lava теперь падает до 0.0 в центрах плит, 
    // там будет отлично виден ваш uDeep/baseColor!
    vec3 finalColor = mix(baseColor, lavaColor, lava);

    gl_FragColor = vec4(finalColor, 1.0);
}