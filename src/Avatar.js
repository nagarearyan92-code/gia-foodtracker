// Cartoon Aryan for gifts: copper curls, warm brown skin, light stubble, charcoal tee, white earbuds.
// pose: flowers | kisses | cuddles | chocolate | treat | thinking | note
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

const SKIN = '#B07552', SKIN_D = '#94603F', SKIN_L = '#C68A66';
const HAIR = '#C96A2B', HAIR_D = '#9A4A1A', HAIR_L = '#E8964E', HAIR_XL = '#F4B072';
const TEE = '#3B3B40', TEE_D = '#2A2A2E';
const EYE = '#2A1810', BROW = '#4A2A18';
const PINK = '#E06B8F', ROSE = '#C2456F', LEAF = '#4E9A5B';

// Curly mop (like Aryan's): a wide, soft cloud of curls, fuller on top than at the sides, with
// curls falling forward over the forehead. Built from evenly spaced bumps so it stays tidy.
const HAIR_PATH = (() => {
  // scalloped outline around a wide oval
  const pts = [], n = 22, cx = 100, cy = 54, rx = 64, ry = 44;
  for (let i = 0; i <= n; i++) {
    const t = Math.PI * (0.86 + (1.28 * i) / n); // from lower-left, over the top, to lower-right
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const nx = mx - cx, ny = my - cy, l = Math.hypot(nx, ny);
    d += ` Q${(mx + (nx / l) * 9).toFixed(1)} ${(my + (ny / l) * 9).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  // fringe: bumpy edge across the forehead, back to the start
  const fr = [[150, 82], [140, 78], [131, 84], [121, 79], [111, 85], [100, 80], [89, 85], [79, 79], [69, 84], [58, 78], [50, 82]];
  fr.forEach(([x, y], i) => {
    const [px, py] = i ? fr[i - 1] : [pts[pts.length - 1][0], pts[pts.length - 1][1]];
    d += ` Q${((px + x) / 2).toFixed(1)} ${(Math.max(py, y) + 6).toFixed(1)} ${x} ${y}`;
  });
  return d + ' Z';
})();
// soft swirls for texture: varied sizes and angles, so it reads as curls (not a pattern)
const CURL_MARKS = [
  [62, 50, 6, 20, 0], [78, 36, 7, 140, 1], [96, 26, 6, 250, 0], [116, 30, 7, 60, 1], [134, 42, 6, 200, 0], [146, 60, 5, 300, 1],
  [70, 66, 5, 90, 1], [88, 52, 7, 320, 0], [108, 46, 6, 170, 1], [126, 58, 6, 30, 0], [56, 70, 4, 220, 0], [100, 66, 5, 110, 1],
  [84, 70, 4, 260, 0], [118, 72, 4, 0, 1], [140, 74, 4, 150, 0],
];
const STRANDS = ['M78 78 q-4 7 1 12', 'M92 80 q4 7 -1 12', 'M106 80 q-4 7 1 11', 'M120 79 q4 6 -1 11'];

function Head({ eyes = 'open', mouth = 'smile' }) {
  return (
    <G>
      <Path d={HAIR_PATH} fill={HAIR_D} transform="translate(0 4) scale(1 1)" />
      {/* neck */}
      <Rect x={88} y={120} width={24} height={22} rx={8} fill={SKIN_D} />
      {/* ears + earbuds */}
      <Ellipse cx={61} cy={100} rx={7} ry={10} fill={SKIN} />
      <Ellipse cx={139} cy={100} rx={7} ry={10} fill={SKIN} />
      <Rect x={55} y={98} width={8} height={13} rx={4} fill="#F4F4F2" stroke="#D9D9D6" strokeWidth={1} />
      <Rect x={137} y={98} width={8} height={13} rx={4} fill="#F4F4F2" stroke="#D9D9D6" strokeWidth={1} />
      {/* face */}
      <Path d="M65 86 C65 58 135 58 135 86 L135 104 C135 124 120 138 100 139 C80 138 65 124 65 104 Z" fill={SKIN} />
      {/* soft jaw shadow + stubble */}
      <Path d="M70 108 C74 126 88 132 100 132 C112 132 126 126 130 108 C124 122 112 127 100 127 C88 127 76 122 70 108 Z" fill={SKIN_D} opacity={0.45} />
      <Path d="M87 114 C93 111 107 111 113 114 C109 116 91 116 87 114 Z" fill={BROW} opacity={0.38} />
      <Path d="M90 127 C95 133 105 133 110 127 C106 130 94 130 90 127 Z" fill={BROW} opacity={0.32} />
      <Path d="M70 110 C74 128 88 136 100 137 C112 136 126 128 130 110" stroke={BROW} strokeOpacity={0.18} strokeWidth={5} fill="none" />
      {/* blush */}
      <Ellipse cx={78} cy={108} rx={7} ry={4} fill={PINK} opacity={0.28} />
      <Ellipse cx={122} cy={108} rx={7} ry={4} fill={PINK} opacity={0.28} />
      {/* brows */}
      <Path d="M76 84 Q84 79 92 83" stroke={BROW} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      <Path d="M108 83 Q116 79 124 84" stroke={BROW} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      {/* eyes */}
      {eyes === 'closed' ? (
        <G>
          <Path d="M77 95 Q84 100 91 95" stroke={EYE} strokeWidth={2.8} strokeLinecap="round" fill="none" />
          <Path d="M109 95 Q116 100 123 95" stroke={EYE} strokeWidth={2.8} strokeLinecap="round" fill="none" />
        </G>
      ) : eyes === 'wink' ? (
        <G>
          <Ellipse cx={84} cy={95} rx={5} ry={5.5} fill={EYE} /><Circle cx={85.6} cy={93.2} r={1.6} fill="#fff" />
          <Path d="M109 96 Q116 91 123 96" stroke={EYE} strokeWidth={2.8} strokeLinecap="round" fill="none" />
        </G>
      ) : (
        <G>
          <Ellipse cx={84} cy={95} rx={5} ry={5.5} fill={EYE} /><Circle cx={85.6} cy={93.2} r={1.6} fill="#fff" />
          <Ellipse cx={116} cy={95} rx={5} ry={5.5} fill={EYE} /><Circle cx={117.6} cy={93.2} r={1.6} fill="#fff" />
        </G>
      )}
      {/* nose */}
      <Path d="M100 99 Q97 108 101 109" stroke={SKIN_D} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      {/* mouth */}
      {mouth === 'kiss' ? (
        <G>
          <Ellipse cx={103} cy={121} rx={5} ry={4.2} fill="#B5566A" />
          <Ellipse cx={103} cy={121} rx={2} ry={1.6} fill="#7E3242" />
        </G>
      ) : mouth === 'grin' ? (
        <Path d="M89 118 Q100 129 111 118 Q100 122 89 118 Z" fill="#7E3242" stroke="#7E3242" strokeWidth={1.5} strokeLinejoin="round" />
      ) : (
        <Path d="M90 119 Q100 126 110 119" stroke="#7E3242" strokeWidth={2.8} strokeLinecap="round" fill="none" />
      )}
      {/* hair on top */}
      <Path d={HAIR_PATH} fill={HAIR} />
      {CURL_MARKS.map(([x, y, r, rot, light], i) => (
        <Path key={'c' + i} transform={`rotate(${rot} ${x} ${y})`}
          d={`M${x - r} ${y} A${r} ${r} 0 1 1 ${x} ${y + r} A${r * 0.55} ${r * 0.55} 0 0 1 ${x - r * 0.3} ${y + r * 0.1}`}
          stroke={light ? HAIR_XL : HAIR_D} strokeOpacity={light ? 0.75 : 0.4} strokeWidth={2} strokeLinecap="round" fill="none" />
      ))}
      <Path d="M70 30 Q86 18 104 20" stroke={HAIR_XL} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.7} />
      {STRANDS.map((d, i) => <Path key={'f' + i} d={d} stroke={HAIR} strokeWidth={5} strokeLinecap="round" fill="none" />)}
    </G>
  );
}

function Tee() {
  return (
    <G>
      <Path d="M40 222 C40 168 62 146 100 146 C138 146 160 168 160 222 Z" fill={TEE} />
      <Path d="M86 146 Q100 158 114 146 Q100 152 86 146 Z" fill={TEE_D} />
    </G>
  );
}

// An arm: shoulder → elbow → hand, sleeve on the upper part.
function Arm({ s, e, h }) {
  return (
    <G>
      <Path d={`M${s[0]} ${s[1]} L${e[0]} ${e[1]}`} stroke={TEE} strokeWidth={20} strokeLinecap="round" />
      <Path d={`M${e[0]} ${e[1]} L${h[0]} ${h[1]}`} stroke={SKIN} strokeWidth={13} strokeLinecap="round" />
      <Circle cx={h[0]} cy={h[1]} r={8.5} fill={SKIN} />
    </G>
  );
}

export function Heart({ x = 0, y = 0, s = 1, c = ROSE }) {
  return <Path transform={`translate(${x} ${y}) scale(${s})`} d="M0 4 C0 -2 8 -2 8 4 C8 9 0 13 0 15 C0 13 -8 9 -8 4 C-8 -2 0 -2 0 4 Z" fill={c} />;
}
function Rose({ x, y, c = ROSE }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={7} fill={c} />
      <Path d={`M${x - 4} ${y} Q${x} ${y - 5} ${x + 4} ${y} Q${x} ${y + 3} ${x - 4} ${y}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} fill="none" />
    </G>
  );
}

function Prop({ pose }) {
  switch (pose) {
    case 'flowers':
      return (
        <G>
          <Path d="M100 196 L94 168 M100 196 L100 166 M100 196 L107 168" stroke={LEAF} strokeWidth={3} />
          <Path d="M84 172 L116 172 L104 204 L96 204 Z" fill="#F7C6D4" stroke="#E8A2B8" strokeWidth={1.5} />
          <Rose x={90} y={162} /><Rose x={104} y={158} c={PINK} /><Rose x={114} y={166} /><Rose x={98} y={150} c="#E8577D" />
          <Ellipse cx={84} cy={168} rx={6} ry={3} fill={LEAF} transform="rotate(-30 84 168)" />
          <Ellipse cx={118} cy={156} rx={6} ry={3} fill={LEAF} transform="rotate(30 118 156)" />
        </G>
      );
    case 'chocolate':
      return (
        <G>
          <Rect x={82} y={164} width={36} height={22} rx={3} fill="#5A3220" />
          <Path d="M94 164 L94 186 M106 164 L106 186 M82 175 L118 175" stroke="#3F2216" strokeWidth={1.5} />
          <Rect x={82} y={178} width={36} height={14} rx={2} fill={ROSE} />
          <Heart x={100} y={180} s={0.5} c="#fff" />
        </G>
      );
    case 'treat':
      return (
        <G>
          <Ellipse cx={100} cy={190} rx={26} ry={6} fill="#fff" stroke="#EBD9DF" strokeWidth={1.5} />
          <Path d="M80 186 L120 186 L118 168 L84 168 Z" fill="#F8D9A8" />
          <Path d="M83 172 L117 172" stroke="#F2A7C0" strokeWidth={4} />
          <Path d="M84 168 Q100 156 118 168 Z" fill="#FFF3F6" />
          <Circle cx={100} cy={159} r={5} fill="#D7263D" /><Path d="M100 154 Q102 150 105 150" stroke={LEAF} strokeWidth={1.5} fill="none" />
        </G>
      );
    case 'note':
      return (
        <G>
          <Rect x={78} y={162} width={44} height={30} rx={3} fill="#FFF7EE" stroke="#E7CFC0" strokeWidth={1.5} />
          <Path d="M78 162 L100 180 L122 162" stroke="#E7CFC0" strokeWidth={1.5} fill="none" />
          <Heart x={100} y={174} s={0.6} />
        </G>
      );
    default: return null;
  }
}

export default function Avatar({ pose = 'note', size = 180 }) {
  let arms, face = {};
  switch (pose) {
    case 'cuddles':
      arms = <><Arm s={[58, 168]} e={[34, 140]} h={[26, 112]} /><Arm s={[142, 168]} e={[166, 140]} h={[174, 112]} /></>;
      face = { mouth: 'grin' };
      break;
    case 'kisses':
      arms = <Arm s={[142, 170]} e={[150, 146]} h={[122, 124]} />;
      face = { eyes: 'wink', mouth: 'kiss' };
      break;
    case 'thinking':
      arms = <Arm s={[142, 172]} e={[146, 150]} h={[132, 128]} />;
      face = { eyes: 'closed', mouth: 'smile' };
      break;
    default: // holding something in front
      arms = <><Arm s={[62, 168]} e={[58, 196]} h={[80, 184]} /><Arm s={[138, 168]} e={[142, 196]} h={[120, 184]} /></>;
      face = { mouth: pose === 'note' ? 'smile' : 'grin' };
  }
  const front = !['cuddles', 'kisses', 'thinking'].includes(pose);
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 -12 200 234">
      <Tee />
      <Head {...face} />
      {front ? <><Prop pose={pose} />{arms}</> : arms}
      {pose === 'kisses' ? <><Heart x={150} y={104} s={0.9} /><Heart x={170} y={84} s={0.6} c={PINK} /></> : null}
      {pose === 'thinking' ? (
        <G>
          <Circle cx={160} cy={58} r={4} fill="#fff" stroke="#EBD9DF" />
          <Circle cx={170} cy={44} r={6} fill="#fff" stroke="#EBD9DF" />
          <Ellipse cx={176} cy={20} rx={20} ry={15} fill="#fff" stroke="#EBD9DF" />
          <Heart x={176} y={14} s={0.8} />
        </G>
      ) : null}
    </Svg>
  );
}
