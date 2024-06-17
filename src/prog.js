export const unis = {
  ctrl_Freq1: 0.0003,
  ctrl_DimapTwist: 0.5,
  ctrl_DimapSwitch: 0,
  ctrl_StripedScrollSwitch: 0,
  ctrl_Freq2: 0.00037,
  ctrl_WaveSwitch: 0,
  ctrl_WaveForce: 0.6,
  ctrl_RotateSwitch: 1,

  ctrl_BufColorShiftFreq: 0.000001,
  ctrl_BufColorShiftDistFreq: 0.001,
  ctrl_BufColorShiftStrength: 0.01,

  ctrl_BufColorShiftSwitch: 0,
  ctrl_ColorDecay: 0.999,
  ctrl_ColorSink: 0.03,
  ctrl_ColorAdmix: 0.05,
};

function select(arr) {
  const n = arr.length;
  const val = Math.random();
  for (let i = 0; i < arr.length; ++i) {
    if (val < (i+1)/n) return arr[i];
  }
}

export function randProgram() {
  unis.ctrl_BufColorShiftFreq = select([0.0006, 0.0001, 0.000001]);
  unis.ctrl_BufColorShiftDistFreq = select([0.001, 0.01]);
  unis.ctrl_BufColorShiftStrength = select([0.01, 0.03]);

  const lessFeedback = Math.random() < 0.2;
  if (lessFeedback) {
    unis.ctrl_ColorDecay = 0.95;
    unis.ctrl_ColorSink = 0.1;
    unis.ctrl_ColorAdmix = 0.45;
  }
  else {
    unis.ctrl_ColorDecay = 0.999;
    unis.ctrl_ColorSink = 0.02;
    unis.ctrl_ColorAdmix = 0.03;
  }

  unis.cltr_Freq1 = select([0.0003, 0.0006, 0.0009]);
  unis.ctrl_DimapTwist = select([0.1, 0.5]);
  if (Math.random() < 0.3) unis.ctrl_DimapSwitch = 1;
  else unis.ctrl_DimapSwitch = 0;
  if (Math.random() < 0.25) unis.ctrl_StripedScrollSwitch = 1;
  else unis.ctrl_StripedScrollSwitch = 0;

  unis.cltr_Freq2 = select([0.00037, 0.00073]);
  unis.ctrl_WaveForce = select([0.6, 1.2]);
  if (lessFeedback || Math.random() < 0.5) unis.ctrl_WaveSwitch = 1;
  else unis.ctrl_WaveSwitch = 0;
  if (Math.random() < 0.25) unis.ctrl_RotateSwitch = 1;
  else unis.ctrl_RotateSwitch = 0;

  unis.ctrl_BufColorShiftSwitch = 0;
  const clrShiftOn = Math.random() < 0.5;
  if (clrShiftOn && !lessFeedback) {
    unis.ctrl_BufColorShiftSwitch = 1;
    unis.ctrl_ColorAdmix = 0.05;
    unis.ctrl_ColorSink = 0.03;
  }
}
