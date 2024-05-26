#version 300 es
precision highp float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D txPrev;
uniform sampler2D txClip0;
out vec4 outColor;

vec3 txFetchUV(sampler2D tx, vec2 p) {
    // Our standard coordinates and (-1, 1) for Y and whatever for X (>1 for landscape)
    // For texture access, must normalize X to (-1, -1) too
    p.x *= resolution.y / resolution.x;
    // But actually we need (0, 1) for both lol, because texture
    p = p * 0.5 + vec2(0.5);
    // Get the color
    return texture(tx, p).rgb;
}

vec2 wave(vec2 uv, float force) {
    float POWER = 0.1; // How much the effect can spread horizontally
    float VERTICAL_SPREAD = 7.0; // How vertically is the sin wave spread
    float ANIM_SPEED = 0.4f; // Animation speed

    float y = (uv.y + time * 0.001 * ANIM_SPEED) * VERTICAL_SPREAD;

    uv.x += (
    // This is the heart of the effect, feel free to modify
    // The sin functions here or add more to make it more complex
    // and less regular
    sin(y)
    + sin(y * 5.0) * 0.2
    + sin(y * 20.0) * 0.03
    )
    * POWER // Limit by maximum spread
    * sin(uv.y * 3.14) // Disable on edges / make the spread a bell curve
    // * sin(time * 0.001) // And make the power change in time
    * force;
    return uv;
}

float intensity(vec4 color){
    return sqrt((color.x*color.x)+(color.y*color.y)+(color.z*color.z));
}

vec2 rot(vec2 p, float a) {
    return vec2(p.x*cos(a)-p.y*sin(a), p.x*sin(a)+p.y*cos(a));
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    vec2 p = (fc / resolution.xy) * 2.0 - 1.0;

    float cycle = (sin(time*0.0006) + 1.) * 0.5;
    vec2 q = p;
    q = wave(q, 0.1 + cycle);
    vec3 clr = txFetchUV(txClip0, q);

    float f = intensity(vec4(clr, 0));
    f = max(0., f - 0.8);
    clr -= 0.55 * vec3(f);

    vec2 fbp = p * (1. - 0.001 * cycle);
    fbp = rot(fbp, 0.006 * cycle);
    vec3 clrPrev = txFetchUV(txPrev, fbp);
    clrPrev = clrPrev * 0.99 - vec3(0.045);
    clr = clrPrev + clr * 0.11;

    outColor = vec4(clr.rgb, 1.0);
}
