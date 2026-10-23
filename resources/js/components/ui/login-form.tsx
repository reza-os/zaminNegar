"use client";

import * as React from 'react';
import { ArrowLeft, Lock, User } from 'lucide-react';
import './login-form.css';

// This shader follows the supplied SmokeyBackground visual effect.
// The rendering loop is scoped to this component and releases the GPU resources on unmount.
const vertexSmokeySource = `
attribute vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

const fragmentSmokeySource = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float time = iTime * 0.5;
  vec2 mouse = iMouse / iResolution;
  vec2 rippleCenter = 2.0 * mouse - 1.0;

  vec2 distortion = centeredUV;
  for (float i = 1.0; i < 8.0; i++) {
    distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
    distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
  }
  float wave = abs(sin(distortion.x + distortion.y + time));
  // Same smoky light falloff, written without reversed smoothstep boundaries.
  float glow = 1.0 - smoothstep(0.2, 0.9, wave);
  fragColor = vec4(u_color * glow, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

type BlurSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface SmokeyBackgroundProps {
  backdropBlurAmount?: BlurSize;
  color?: string;
  className?: string;
}

const blurClassMap: Record<BlurSize, string> = {
  none: 'backdrop-blur-none',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl',
};

function rgbFromHex(hex: string): [number, number, number] {
  const normalized = /^#[\da-fA-F]{6}$/.test(hex) ? hex : '#1E40AF';
  return [1, 3, 5].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255) as [number, number, number];
}

export function SmokeyBackground({
  backdropBlurAmount = 'sm',
  color = '#1E40AF',
  className = '',
}: SmokeyBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return; // A visible CSS gradient remains for reduced motion / no WebGL.

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[SmokeyBackground] Could not compile shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexSmokeySource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSmokeySource);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[SmokeyBackground] Shader link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'iResolution');
    const uTime = gl.getUniformLocation(program, 'iTime');
    const uMouse = gl.getUniformLocation(program, 'iMouse');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const [r, g, b] = rgbFromHex(color);
    gl.uniform3f(uColor, r, g, b);

    let frame = 0;
    let lastFrame = 0;
    const startTime = performance.now();
    let mouseX = 0;
    let mouseY = 0;
    let hovering = false;

    const resize = () => {
      // Limit GPU load on high-density mobile screens while retaining the visual effect.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      hovering = event.clientX >= box.left && event.clientX <= box.right &&
        event.clientY >= box.top && event.clientY <= box.bottom;
      if (hovering) {
        const ratioX = canvas.width / Math.max(1, box.width);
        const ratioY = canvas.height / Math.max(1, box.height);
        mouseX = (event.clientX - box.left) * ratioX;
        mouseY = (box.bottom - event.clientY) * ratioY;
      }
    };

    const render = (now: number) => {
      if (document.hidden) {
        frame = 0;
        return;
      }
      // 30fps is enough for this slowly moving effect and reduces background GPU use.
      if (now - lastFrame >= 1000 / 30) {
        resize();
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uTime, (now - startTime) / 1000);
        gl.uniform2f(uMouse, hovering ? mouseX : canvas.width / 2, hovering ? mouseY : canvas.height / 2);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        lastFrame = now;
      }
      frame = requestAnimationFrame(render);
    };

    const onVisibilityChange = () => {
      if (!document.hidden && !frame) frame = requestAnimationFrame(render);
    };

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    resize();
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [color]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#111827] ${className}`} aria-hidden="true">
      {/* Also serves as the non-WebGL and reduced-motion fallback. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 35% 40%, rgba(37,99,235,0.34), transparent 65%), radial-gradient(ellipse at 75% 75%, rgba(30,64,175,0.36), transparent 60%)',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className={`absolute inset-0 ${blurClassMap[backdropBlurAmount]}`} />
    </div>
  );
}

export interface LoginFormProps {
  login: string;
  password: string;
  onLoginChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  loading?: boolean;
  error?: string;
}

/**
 * Login form for the existing Laravel authentication flow.
 * Form labels stay above their fields so they never overlap autofilled values.
 */
export function LoginForm({
  login,
  password,
  onLoginChange,
  onPasswordChange,
  onSubmit,
  loading = false,
  error = '',
}: LoginFormProps) {
  return (
    <div
      className="zn-login relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/20 bg-[#131c30]/65 px-6 py-8 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:px-9 sm:py-10"
      dir="rtl"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.07] to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mb-8 text-center">
        <p className="mb-3 text-xs font-semibold tracking-normal text-blue-200">
          سامانه مدیریت زمین‌نگار
        </p>
        <h1 className="text-[28px] font-extrabold leading-[1.55] text-white sm:text-[30px]">
          خوش آمدید
        </h1>
        <p className="mx-auto mt-1.5 max-w-[310px] text-[13px] font-normal leading-7 text-slate-200/90 sm:text-sm">
          برای ورود به حساب کاربری، اطلاعات خود را وارد کنید.
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative z-10 space-y-5">
        <div>
          <label
            htmlFor="zamin-login"
            className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold leading-6 text-slate-100"
          >
            <User size={17} strokeWidth={1.8} className="shrink-0 text-blue-200" aria-hidden="true" />
            <span>ایمیل، نام کاربری یا شماره موبایل</span>
          </label>
          <input
            type="text"
            id="zamin-login"
            name="login"
            value={login}
            onChange={(event) => onLoginChange(event.target.value)}
            autoComplete="username"
            inputMode="text"
            required
            placeholder="ایمیل یا نام کاربری خود را وارد کنید"
            dir="auto"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            className="zn-login-input block h-[54px] w-full rounded-xl border border-white/20 bg-slate-950/40 px-4 text-sm font-normal text-white outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:bg-slate-950/55 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        <div>
          <label
            htmlFor="zamin-password"
            className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold leading-6 text-slate-100"
          >
            <Lock size={17} strokeWidth={1.8} className="shrink-0 text-blue-200" aria-hidden="true" />
            <span>رمز عبور</span>
          </label>
          <input
            type="password"
            id="zamin-password"
            name="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
            required
            placeholder="رمز عبور خود را وارد کنید"
            dir="ltr"
            aria-invalid={Boolean(error)}
            className="zn-login-input block h-[54px] w-full rounded-xl border border-white/20 bg-slate-950/40 px-4 text-left text-sm font-normal text-white outline-none transition-colors duration-200 placeholder:text-right placeholder:text-slate-400 focus:border-blue-400 focus:bg-slate-950/55 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-[13px] leading-6 text-red-100">
            {error}
          </p>
        )}

        <p className="text-center text-xs font-normal leading-7 text-slate-300">
          رمز عبور خود را فراموش کرده‌اید؟ با مدیر سامانه تماس بگیرید.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="group mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(37,99,235,0.9)] transition-all duration-200 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131c30] disabled:cursor-wait disabled:opacity-60"
        >
          <span>{loading ? 'در حال ورود…' : 'ورود به سامانه'}</span>
          {!loading && <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
