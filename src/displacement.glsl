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

vec2 rot(vec2 p, float a) {
    return vec2(p.x*cos(a)-p.y*sin(a), p.x*sin(a)+p.y*cos(a));
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 cx_mul(vec2 a, vec2 b) {
    return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x);
}

vec2 cx_div(vec2 a, vec2 b) {
    return vec2(
    (a.x*b.x+a.y*b.y)/(b.x*b.x+b.y*b.y),
    (a.y*b.x-a.x*b.y)/(b.x*b.x+b.y*b.y)
    );
}

vec2 dimap(vec2 p, float prm) {
    float a, b, c, d, e, f;

    // Preset 1: two centers, space in center
    a=16.; b=0.;c=49.;d=18.;e=50.;

    // Preset 2: two centers, much detail
    // a=82.; b=89.;c=33.;d=18.;e=92.;

    // Preset 3: legs visible, space around
    // a=9.;b=111.;c=47.;d=0.;e=20.;


    // Norotate
    // f = 100. + (rnd - 0.5) * time * 0.0000001;
    f = prm;
    // f = 64. + time * 0.00001;

    // Formula
    p = cx_mul(p, p);
    p = cx_mul(p, vec2(1.+5.*a/128., 4.*b/128.));
    p = p - vec2(4.*c/128.);
    p = cx_div(vec2(16.*d/128., 16.*e/128.), p);
    p = rot(p, time * 0.005 * (f-64.)/128.);
    return p;
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

uniform float ctrl_Freq1;
uniform float ctrl_DimapTwist;
uniform float ctrl_DimapSwitch;
uniform float ctrl_StripedScrollSwitch;
uniform float ctrl_Freq2;
uniform float ctrl_WaveSwitch;
uniform float ctrl_WaveForce;
uniform float ctrl_RotateSwitch;

uniform float ctrl_BufColorShiftFreq;
uniform float ctrl_BufColorShiftDistFreq;
uniform float ctrl_BufColorShiftStrength;

uniform float ctrl_BufColorShiftSwitch;
uniform float ctrl_ColorDecay;
uniform float ctrl_ColorSink;
uniform float ctrl_ColorAdmix;

vec3 ctrl_BufColorShift(vec3 hsv, vec2 p) {
    float cycle = sin(time * ctrl_BufColorShiftFreq);
    float dst = length(p);
    hsv[0] = fract(hsv[0] + ctrl_BufColorShiftDistFreq * sin(dst));
    hsv[0] = fract(hsv[0] + ctrl_BufColorShiftStrength * cycle);
    hsv[2] = max(0.05, pow(hsv[2], 0.3) - 0.3);
    return hsv;
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    vec2 p = (fc / resolution.xy) * 2.0 - 1.0;
    vec3 clr, clrClip, hsvClip;

    float cycle1 = (sin(time*ctrl_Freq1) + 1.) * 0.5;
    float cycle2 = (sin(time*ctrl_Freq2) + 1.) * 0.5;

    vec2 q = p;
    if (ctrl_DimapSwitch > 0.) q = dimap(p, 64. + cycle1 * ctrl_DimapTwist);
    if (ctrl_WaveSwitch > 0.) q = wave(q, 0.2 + ctrl_WaveForce * cycle2);
    clrClip = txFetchUV(txClip0, q);
    hsvClip = rgb2hsv(clrClip);

    clr = clrClip;

    vec2 fbp = p * 0.999;
    if (ctrl_StripedScrollSwitch > 0.) {
        float hf = pow(sin(fbp.y * 14.), 5.);
        fbp.x += hf * 0.004 * cycle1;// striped hscroll
    }
    if (ctrl_RotateSwitch > 0.) fbp = rot(fbp, 0.006 * -cycle2);

    vec3 clrPrev = txFetchUV(txPrev, fbp);
    vec3 hsvPrev = rgb2hsv(clrPrev);
    hsvPrev = (1.0-ctrl_BufColorShiftSwitch) * hsvPrev +
    ctrl_BufColorShiftSwitch * ctrl_BufColorShift(hsvPrev, fbp);

    clrPrev = hsv2rgb(hsvPrev);
    clrPrev = clrPrev * ctrl_ColorDecay - vec3(ctrl_ColorSink);
    clr = clrPrev + clr * ctrl_ColorAdmix;

    outColor = vec4(clr.rgb, 1.0);
}
