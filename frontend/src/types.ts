export interface AnchorPoint {
  id: string;
  x: number;
  y: number;
  frequency: number;
  name?: string;
  baseBrightness?: number;
  size?: number;
}

export interface ConstellationEdge {
  from: string;
  to: string;
  frequencyRatio: [number, number];
}

export interface LevelData {
  id: number;
  name: string;
  creatureName: string;
  creatureDescription: string;
  anchorPoints: AnchorPoint[];
  edges: ConstellationEdge[];
  lightPollution: {
    baseIntensity: number;
    variability: number;
    speed: number;
  };
  rotationSpeed: number;
}

export interface BackgroundStar {
  x: number;
  y: number;
  z: number;
  size: number;
  baseBrightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: string;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface CurvePoint extends ScreenPoint {
  t?: number;
}

export interface Connection {
  from: string;
  to: string;
  curve: CurvePoint[];
  valid: boolean;
  opacity: number;
  glowIntensity: number;
}

export interface DrawState {
  isDrawing: boolean;
  startAnchorId: string | null;
  currentPos: ScreenPoint | null;
  points: CurvePoint[];
  lastSampleTime: number;
}

export interface GameState {
  currentLevel: number;
  levelData: LevelData | null;
  connections: Connection[];
  completedEdges: Set<string>;
  drawState: DrawState;
  rotationOffset: number;
  time: number;
  showFrequencies: boolean;
  isComplete: boolean;
  snapTargetId: string | null;
}

export interface VerifyResult {
  success: boolean;
  valid: boolean;
  isHarmonic: boolean;
  isDefinedEdge: boolean;
  frequencies?: Record<string, number>;
  ratio?: [number, number] | null;
}

export interface PaletteConfig {
  starDensity: number;
  twinkleSpeed: number;
  lightPollution: number;
  hueShift: number;
}

export const DEFAULT_PALETTE: PaletteConfig = {
  starDensity: 400,
  twinkleSpeed: 1,
  lightPollution: 1,
  hueShift: 0
};

export const PALETTE_RANGES = {
  starDensity: { min: 50, max: 1500, step: 50 },
  twinkleSpeed: { min: 0, max: 3, step: 0.1 },
  lightPollution: { min: 0, max: 3, step: 0.1 },
  hueShift: { min: 0, max: 1, step: 0.01 }
} as const;

export interface PaletteValidationResult {
  config: PaletteConfig;
  warnings: string[];
}

function isValidNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
}

function clampAndRound(
  value: number,
  min: number,
  max: number,
  step: number
): number {
  const steps = Math.round((value - min) / step);
  const clamped = Math.min(max, Math.max(min, min + steps * step));
  return Number(clamped.toFixed(10));
}

export function validatePaletteConfig(
  raw: unknown
): PaletteValidationResult {
  const warnings: string[] = [];
  const result: PaletteConfig = { ...DEFAULT_PALETTE };

  let obj: Record<string, unknown>;
  if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  } else {
    warnings.push('配置格式无效，使用默认值');
    return { config: result, warnings };
  }

  const validateField = <K extends keyof PaletteConfig>(
    key: K,
    rawValue: unknown,
    label: string
  ): void => {
    const range = PALETTE_RANGES[key];
    const def = DEFAULT_PALETTE[key];

    if (rawValue === undefined || rawValue === null) {
      warnings.push(`${label} 缺失，回退默认值 ${def}`);
      result[key] = def;
      return;
    }

    if (!isValidNumber(rawValue)) {
      warnings.push(`${label} 非法 (${String(rawValue)})，回退默认值 ${def}`);
      result[key] = def;
      return;
    }

    const clamped = clampAndRound(rawValue, range.min, range.max, range.step);
    if (clamped !== rawValue) {
      if (rawValue < range.min || rawValue > range.max) {
        warnings.push(`${label} 越界 (${rawValue})，裁剪为 ${clamped}`);
      }
    }
    result[key] = clamped;
  };

  validateField('starDensity', obj.starDensity, '星密度');
  validateField('twinkleSpeed', obj.twinkleSpeed, '闪烁速度');
  validateField('lightPollution', obj.lightPollution, '光污染强度');

  let hueRaw = obj.hueShift;
  if (hueRaw === undefined && obj.hue !== undefined) {
    warnings.push('检测到旧格式字段 hue，迁移到 hueShift');
    hueRaw = obj.hue;
  }
  validateField('hueShift', hueRaw, '整体色调');

  return { config: result, warnings };
}
