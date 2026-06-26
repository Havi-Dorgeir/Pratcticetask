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
    vec2 uv1 = vWorldXZ *  0.0005;
    vec3 v1 = voronoi(uv1);
    vec2 uv2 = (vWorldXZ * 0.002 + v1.xy * 49.9) ;
    vec3 v2  = voronoi(uv2) * 15.0;
    vec2 uv  = vWorldXZ * 0.0099+ vec2(uTime *  0.95, uTime * 0.001);
    vec3 v = voronoi(uv);
    float f1 = v.x;
    float f2 = v.y;
    float id = v2.z; 
    float edge =  v2.y - v2.x;
    float lava = 1.0 - smoothstep(0.009, 0.09,edge);
    vec3 lavaColor = mix (uMid, uCrest, id); 
    
    vec3 deep  = uDeep;
    vec3 mid   = uMid;
    vec3 crest = uCrest;
    vec3 color = deep;
    vec3 cellColor = mix(deep, mid, id);
    float glint  = smoothstep(0.9, 0.0, edge) * 0.1 ; 
    color = mix(color, cellColor, 0.09);
    color = mix(color, lavaColor, lava);
    
    //-------------------
    vec2 uvMask = vWorldXZ * 0.00009  + vec2(uTime * 0.001, uTime * 0.02);
    vec3 vm = voronoi(uvMask);
    float maskEdge = vm.y - vm.x;

    float holeSize = 0.09;
    float holeSoft = 0.09;
    float hole = smoothstep(holeSize, holeSize + holeSoft,vm.x);

    vec3 maskColor = vec3(0.001);
    
    color = mix(color, maskColor, hole);
    float lavaBrigtness = (1.0 - hole);
    color += lavaColor * lavaBrigtness * 1.5;

 gl_FragColor = vec4(color, 1.0);
}