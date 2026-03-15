export type ProjectType = 'mood-board' | 'storyboard' | 'first-frames';

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  createdAt: number;
  updatedAt: number;
  thumbnailBlobId: string | null;
  imageCount: number;
}

export interface BoardImage {
  id: string;
  projectId: string;
  blobId: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  x: number;
  y: number;
  label: string;
  createdAt: number;
  displayWidth?: number;
  displayHeight?: number;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  mediaType?: 'image' | 'video';
  duration?: number; // seconds, for videos
  accentColor?: string; // per-image accent for note theming
  shotOrder?: number;   // ordering in shot sequence panel
}

export interface ImageBlob {
  id: string;
  blob: Blob;
}

export interface Connection {
  id: string;
  projectId: string;
  fromId: string;
  toId: string;
  label: string;
}

export interface TextNode {
  id: string;
  projectId: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: number;
}

// ─── Shot Category Notes (Image-to-Video Prompting) ─────────────────────────

export type ShotCategoryId =
  | 'camera'
  | 'subject'
  | 'action'
  | 'environment'
  | 'lighting'
  | 'texture'
  | 'audio'
  | 'mood'
  | 'color'
  | 'lens'
  | 'time';

export interface ShotCategory {
  id: ShotCategoryId;
  label: string;
  color: string;         // accent hex
  bg: string;            // card background
  border: string;        // border color
  icon: string;          // emoji icon
  placeholder: string;   // textarea hint text
  prompts: string[];     // checklist hints shown inside the note
}

export const SHOT_CATEGORIES: ShotCategory[] = [
  {
    id: 'camera',
    label: 'Camera',
    color: '#60a5fa',
    bg: '#0c1829',
    border: '#1e3a5f',
    icon: '📷',
    placeholder: 'e.g. Handheld tracking shot, low angle, slight tilt...',
    prompts: ['Shot type?', 'Camera movement?', 'Angle?', 'Framing?'],
  },
  {
    id: 'subject',
    label: 'Subject',
    color: '#4ade80',
    bg: '#0b1e14',
    border: '#1a4a2a',
    icon: '👤',
    placeholder: 'e.g. Protagonist in mid-shot, looking left, tense...',
    prompts: ['Who / what is in frame?', 'Pose / position?', 'Expression?', 'Wardrobe details?'],
  },
  {
    id: 'action',
    label: 'Action',
    color: '#c084fc',
    bg: '#160d24',
    border: '#3b1f5e',
    icon: '⚡',
    placeholder: 'e.g. Character runs toward camera, stumbles, looks back...',
    prompts: ['What happens?', 'Speed / pacing?', 'Key beat?', 'Transition out?'],
  },
  {
    id: 'environment',
    label: 'Environment',
    color: '#fb923c',
    bg: '#1c1008',
    border: '#4a2c10',
    icon: '🌍',
    placeholder: 'e.g. Abandoned warehouse, dusk, fog rolling in...',
    prompts: ['Location / setting?', 'Time of day?', 'Weather?', 'Era / period?'],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    color: '#22d3ee',
    bg: '#071a1e',
    border: '#0f3d47',
    icon: '💡',
    placeholder: 'e.g. Hard rim light from left, practical neon signs, deep shadows...',
    prompts: ['Key light direction?', 'Quality (hard/soft)?', 'Color temp?', 'Practicals in scene?'],
  },
  {
    id: 'texture',
    label: 'Texture',
    color: '#2dd4bf',
    bg: '#071c1a',
    border: '#0f3d39',
    icon: '🖼️',
    placeholder: 'e.g. Film grain, analog noise, shallow DOF with lens flares...',
    prompts: ['Film look / grain?', 'Lens character?', 'Color grade style?', 'VFX / comp notes?'],
  },
  {
    id: 'audio',
    label: 'Audio',
    color: '#86efac',
    bg: '#061510',
    border: '#143d24',
    icon: '🎵',
    placeholder: 'e.g. Diegetic: rain + distant sirens. Score: tense strings swell...',
    prompts: ['Diegetic sounds?', 'Score / music style?', 'Dialogue / VO?', 'Silence / ambient?'],
  },
  {
    id: 'mood',
    label: 'Mood',
    color: '#f472b6',
    bg: '#1c0a14',
    border: '#4a1a30',
    icon: '😌',
    placeholder: 'e.g. Paranoid, claustrophobic, the moment before the storm...',
    prompts: ['Emotional tone?', 'Tension level?', 'Genre feel?', 'Reference films?'],
  },
  {
    id: 'color',
    label: 'Color',
    color: '#facc15',
    bg: '#191200',
    border: '#453600',
    icon: '🎨',
    placeholder: 'e.g. Teal & orange contrast, desaturated midtones, crush blacks...',
    prompts: ['Palette / scheme?', 'Dominant hues?', 'Contrast level?', 'Grade reference?'],
  },
  {
    id: 'lens',
    label: 'Lens',
    color: '#a78bfa',
    bg: '#130d22',
    border: '#321d5e',
    icon: '🔭',
    placeholder: 'e.g. 35mm, f/1.4, front bokeh, slight vignette...',
    prompts: ['Focal length?', 'Aperture / DOF?', 'Distortion?', 'Filter / diffusion?'],
  },
  {
    id: 'time',
    label: 'Time',
    color: '#f97316',
    bg: '#1a0b02',
    border: '#4a2006',
    icon: '⏱️',
    placeholder: '',
    prompts: [],
  },
];

// ─── Image Prompt Notes (6-Part Formula from Nano Banana) ───────────────────

export type EditCategoryId =
  | 'edit-subject'
  | 'edit-action'
  | 'edit-environment'
  | 'edit-art-style'
  | 'edit-lighting'
  | 'edit-camera';

export interface EditCategory {
  id: EditCategoryId;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  zone: 'keep' | 'cut'; // kept for type compatibility
  placeholder: string;
  prompts: string[];
}

// The 6-Part Prompt Formula — based on Nano Banana 2 prompting guide
export const EDIT_CATEGORIES: EditCategory[] = [
  {
    id: 'edit-subject',
    label: 'Subject',
    color: '#4ade80',
    bg: '#0b1e14',
    border: '#1a4a2a',
    icon: '👤',
    zone: 'keep',
    placeholder: 'e.g. "a woman in her late 20s with olive skin, dark hair loosely tied back, minimal jewelry"',
    prompts: [
      'Age, build & ethnicity?',
      'Face: eyes, jawline, expression?',
      'Hair: color, style, length?',
      'Clothing: fabric, fit, details?',
    ],
  },
  {
    id: 'edit-action',
    label: 'Action',
    color: '#c084fc',
    bg: '#160d24',
    border: '#3b1f5e',
    icon: '⚡',
    zone: 'keep',
    placeholder: 'e.g. "sitting cross-legged on a couch scrolling her phone, relaxed open posture"',
    prompts: [
      'What is the subject doing?',
      'Body posture & weight?',
      'Facial expression & gaze?',
      'Props being held or used?',
    ],
  },
  {
    id: 'edit-environment',
    label: 'Environment',
    color: '#fb923c',
    bg: '#1c1008',
    border: '#4a2c10',
    icon: '🌍',
    zone: 'keep',
    placeholder: 'e.g. "bright modern apartment, sheer white curtains, natural daylight flooding in from the left"',
    prompts: [
      'Location: indoor or outdoor?',
      'Time of day & natural light?',
      'Background details & props?',
      'Atmosphere: warm, cold, busy?',
    ],
  },
  {
    id: 'edit-art-style',
    label: 'Art Style',
    color: '#facc15',
    bg: '#191200',
    border: '#453600',
    icon: '🎨',
    zone: 'keep',
    placeholder: 'e.g. "photorealistic, shot on iPhone, candid and natural, lifestyle editorial feel"',
    prompts: [
      'Photorealistic or stylized?',
      'Film or digital? Shot on what?',
      'Editorial, cinematic, or UGC?',
      'Era, movement, or reference?',
    ],
  },
  {
    id: 'edit-lighting',
    label: 'Lighting',
    color: '#22d3ee',
    bg: '#071a1e',
    border: '#0f3d47',
    icon: '💡',
    zone: 'keep',
    placeholder: 'e.g. "soft diffused daylight from a large window, warm afternoon light, no harsh shadows"',
    prompts: [
      'Key light: direction & source?',
      'Hard (harsh) or soft (diffused)?',
      'Warm, cool, or neutral tones?',
      'Shadow depth: deep or lifted?',
    ],
  },
  {
    id: 'edit-camera',
    label: 'Camera',
    color: '#60a5fa',
    bg: '#0c1829',
    border: '#1e3a5f',
    icon: '📷',
    zone: 'keep',
    placeholder: 'e.g. "medium close-up, slightly above eye level, 85mm portrait lens, shallow DOF, handheld UGC feel"',
    prompts: [
      'Framing: ECU, CU, MCU, MS, WS?',
      'Angle: eye level, low, high?',
      'Lens & focal length?',
      'DOF: bokeh or sharp background?',
    ],
  },
];

export interface CategoryNote {
  id: string;
  projectId: string;
  imageId: string;          // parent image node
  categoryId: ShotCategoryId;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  checkedPrompts: string[]; // which prompt hints are checked off
  isMinimized?: boolean;    // minimize/maximize state
}

export interface EditNote {
  id: string;
  projectId: string;
  imageId: string;
  categoryId: EditCategoryId;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  checkedPrompts: string[];
  isMinimized?: boolean;
}

// ─── Persistent Prompt Nodes ──────────────────────────────────────────────────

export interface PromptVersion {
  text: string;
  model: string;
  createdAt: number;
}

export interface PromptNode {
  id: string;
  projectId: string;
  imageId: string;          // parent image (for tether line)
  text: string;             // the generated prompt text
  model: string;            // model that generated it
  promptType: 'i2v' | 'edit';
  x: number;
  y: number;
  width: number;
  isMinimized: boolean;
  createdAt: number;
  history?: PromptVersion[]; // last 3 versions (most recent first)
}

// ─── Scene Groups ─────────────────────────────────────────────────────────────

export interface SceneGroup {
  id: string;
  projectId: string;
  name: string;
  imageIds: string[];       // images in this scene
  isCollapsed: boolean;
  x: number;
  y: number;
  color: string;            // accent border color
}

// ─── Global Notes ─────────────────────────────────────────────────────────────

export interface GlobalNote {
  id: string;
  projectId: string;
  categoryId: ShotCategoryId | EditCategoryId;
  text: string;
  isGlobal: true;           // always true — marks it as global
  color: string;
}

// ─── Director's Guide — structured option data ────────────────────────────────

export interface DirectorSubOption {
  name: string;    // short label shown on pill, e.g. "Profile"
  insert: string;  // text appended when clicked
}

export interface DirectorOption {
  name: string;      // short code shown as chip, e.g. "ECU"
  label?: string;    // full name, e.g. "Extreme Close-Up"
  effect: string;    // what this choice does to the audience/story
  insert: string;    // text appended to the note when clicked
  subOptions?: DirectorSubOption[];
}

export interface DirectorGuide {
  context: string;           // one-line framing of what the question is really asking
  options: DirectorOption[];
}

export const SHOT_DIRECTOR_GUIDES: Record<string, DirectorGuide> = {
  // ── CAMERA ──
  'Shot type?': {
    context: 'How close are you to your subject? Distance controls emotional intimacy.',
    options: [
      { name: 'MACRO', label: 'Macro Focus', effect: 'Microscopic detail taking up the entire frame. Beyond ECU. Science, surrealism, or obsession.', insert: 'macro photography, beyond extreme close-up', subOptions: [{ name: 'Iris', insert: 'macro shot of human iris' }, { name: 'Tear', insert: 'macro shot of a single tear falling' }, { name: 'Texture', insert: 'macro detail shot of texture' }, { name: 'Insect', insert: 'macro detail of small creature/insect' }] },
      { name: 'ECU', label: 'Extreme Close-Up', effect: 'Isolates one micro-detail — an eye, a finger, a key. Forces the audience to focus on exactly one thing. Intimacy, dread, or revelation.', insert: 'extreme close-up', subOptions: [{ name: 'Eye', insert: 'extreme close-up on eye' }, { name: 'Hands', insert: 'extreme close-up on hands' }, { name: 'Lips', insert: 'extreme close-up on lips' }, { name: 'Object detail', insert: 'extreme close-up detail on object' }, { name: 'Weapon grip', insert: 'extreme close-up tight grip on weapon' }] },
      { name: 'CU', label: 'Close-Up', effect: "The most emotionally connecting shot in cinema. The audience reads the character's face. Dialogue hits hardest here.", insert: 'close-up', subOptions: [{ name: 'Frontal', insert: 'close-up, frontal' }, { name: 'Profile', insert: 'close-up, profile' }, { name: '3/4 turn', insert: 'close-up, 3/4 turn' }, { name: 'Over-shoulder', insert: 'over-shoulder close-up' }, { name: 'Choker', insert: 'choker close-up, forehead to chin' }] },
      { name: 'MCU', label: 'Med. Close-Up', effect: 'Intimate but includes shoulders. The workhorse of dialogue scenes — personal without being claustrophobic.', insert: 'medium close-up', subOptions: [{ name: 'Static', insert: 'medium close-up, static frame' }, { name: 'Handheld', insert: 'medium close-up, handheld' }, { name: 'Dutch tilt', insert: 'medium close-up, dutch tilt' }, { name: 'Two-shot', insert: 'medium close-up two-shot' }] },
      { name: 'MS', label: 'Medium Shot', effect: 'Reveals body language alongside face. Connects physical action to emotional state.', insert: 'medium shot', subOptions: [{ name: 'Cowboy', insert: 'cowboy shot, mid-thigh up' }, { name: 'American', insert: 'american shot, knee up' }, { name: 'Two-shot', insert: 'medium two-shot' }, { name: 'Walking', insert: 'medium shot, subject walking' }, { name: 'Three-shot', insert: 'medium three-shot, ensemble' }] },
      { name: 'WS', label: 'Wide Shot', effect: 'Full body in environment. Establishes context, can convey isolation or scale.', insert: 'wide shot', subOptions: [{ name: 'Full body', insert: 'wide shot, full body visible' }, { name: 'Environmental', insert: 'environmental wide shot' }, { name: 'Crowd', insert: 'wide shot with crowd context' }, { name: 'Silhouette', insert: 'wide silhouette against background' }] },
      { name: 'ELS', label: 'Extreme Long', effect: 'The character is tiny in the frame. Signals powerlessness, vastness, or destiny.', insert: 'extreme long shot', subOptions: [{ name: 'Aerial', insert: 'aerial extreme long shot' }, { name: 'Ground level', insert: 'ground-level extreme long' }, { name: 'On horizon', insert: 'figure on horizon line, extreme long' }, { name: 'Drone', insert: 'drone extreme long shot' }] },
    ],
  },
  'Camera movement?': {
    context: 'Camera movement is an emotional statement. A still camera waits; a moving camera seeks.',
    options: [
      { name: 'STATIC', label: 'Locked-Off', effect: 'All dramatic weight falls on the actor. The frame holds — the emotion must fill it. Used for control and inevitability.', insert: 'static, locked-off', subOptions: [{ name: 'Stone still', insert: 'completely static, zero camera movement' }, { name: 'Subtle drift', insert: 'static with imperceptible slow drift' }, { name: 'Breathing frame', insert: 'locked-off, subtly breathing frame' }] },
      { name: 'PUSH', label: 'Dolly In', effect: 'Slowly closes distance. Builds tension, intimacy, or dread. The audience is drawn in whether they want to be or not.', insert: 'slow dolly push-in', subOptions: [{ name: 'Slow creep', insert: 'extremely slow dolly creep-in' }, { name: 'Fast push', insert: 'fast urgent dolly push-in' }, { name: 'Push to ECU', insert: 'dolly push all the way to extreme close-up' }] },
      { name: 'PULL', label: 'Dolly Out', effect: 'Reveals the wider world as the character recedes. Signals isolation, loss, or an overwhelming situation.', insert: 'dolly pull-out, retreating', subOptions: [{ name: 'Reveal space', insert: 'dolly pull-out, revealing wider environment' }, { name: 'Isolate', insert: 'pull-back isolating character in space' }, { name: 'Snap pull', insert: 'snap pull-back, sudden retreat' }] },
      { name: 'PAN', label: 'Horizontal Pan', effect: 'Follows action or reveals space. Can connect two subjects in one unbroken observation.', insert: 'slow pan', subOptions: [{ name: 'Slow reveal', insert: 'slow deliberate reveal pan' }, { name: 'Whip pan', insert: 'whip pan transition, snap L to R' }, { name: '180° pan', insert: '180-degree pan around subject' }] },
      { name: 'HH', label: 'Handheld', effect: 'Adds presence and unease. Makes the scene feel observed, raw, real. The audience becomes a witness.', insert: 'handheld, observational', subOptions: [{ name: 'Subtle', insert: 'subtle handheld, barely perceptible shake' }, { name: 'Aggressive', insert: 'aggressive handheld, unstable and urgent' }, { name: 'Running', insert: 'running handheld, full chaotic energy' }] },
      { name: 'STEAD', label: 'Steadicam', effect: 'Floats through space — neither fully stable nor shaky. Dreamlike and inevitable. Think The Shining.', insert: 'steadicam float', subOptions: [{ name: 'Follow', insert: 'steadicam following behind subject' }, { name: 'Float approach', insert: 'steadicam floating approach toward subject' }, { name: 'Corridor', insert: 'steadicam corridor tracking shot' }] },
      { name: 'PAN', label: 'Pan', effect: 'Camera swivels left or right on a fixed axis. Connects two subjects or reveals new space.', insert: 'pan', subOptions: [{ name: 'Slow pan L', insert: 'slow deliberate pan left' }, { name: 'Slow pan R', insert: 'slow deliberate pan right' }, { name: 'Revealing pan', insert: 'pan revealing new element' }] },
      { name: 'TILT', label: 'Tilt', effect: 'Camera swivels up or down on a fixed axis. Shows scale, altitude, or reveals a character head-to-toe.', insert: 'tilt', subOptions: [{ name: 'Tilt up', insert: 'tilt up, revealing scale or face' }, { name: 'Tilt down', insert: 'tilt down, revealing what subject sees' }] },
      { name: 'WHIP', label: 'Whip Pan', effect: 'Cuts time or creates kinetic energy. Used for comedy, urgency, or disorientation.', insert: 'whip pan', subOptions: [{ name: 'L → R', insert: 'whip pan left to right' }, { name: 'R → L', insert: 'whip pan right to left' }, { name: 'Smash', insert: 'smash whip pan, maximum velocity' }] },
      { name: 'ZOOM', label: 'Crash Zoom', effect: 'Sudden, violent magnification. Exaggerates realization or panic.', insert: 'rapid crash zoom', subOptions: [{ name: 'Snap zoom in', insert: 'snap crash zoom in' }, { name: 'Snap zoom out', insert: 'snap crash zoom out' }, { name: 'Slow creep zoom', insert: 'slow creeping zoom in' }] },
      { name: 'SNOR', label: 'SnorriCam', effect: 'Camera attached to the actor. Background moves wildly while the face stays locked. Disorientation, drunkenness, or panic.', insert: 'SnorriCam body-mount, locked on face', subOptions: [{ name: 'Running', insert: 'running SnorriCam' }, { name: 'Stumbling', insert: 'stumbling SnorriCam, drunk physics' }] },
    ],
  },
  'Angle?': {
    context: 'Angle is a power relationship. Where the camera sits determines how the audience feels about the subject.',
    options: [
      { name: 'EYE', label: 'Eye Level', effect: 'Neutral. The audience is a peer. The most honest and relatable angle. Nothing is implied about power.', insert: 'eye-level angle', subOptions: [{ name: 'Exact neutral', insert: 'exact eye-level, neutral' }, { name: 'Slight high', insert: 'slightly above eye level, +10°' }, { name: 'Slight low', insert: 'slightly below eye level, -10°' }] },
      { name: 'LOW', label: 'Low Angle', effect: 'Subject appears powerful, threatening, or heroic. The audience literally looks up at them.', insert: 'low angle, looking up', subOptions: [{ name: 'Subtle 15°', insert: 'subtle low angle, 15° tilt up' }, { name: 'Dramatic 30°', insert: 'dramatic low angle, 30° tilt up' }, { name: 'Near ground', insert: 'near ground level, sharp upward tilt' }] },
      { name: 'HIGH', label: 'High Angle', effect: 'Subject appears small, vulnerable, or watched. The audience holds the power position.', insert: 'high angle, looking down', subOptions: [{ name: 'Subtle 15°', insert: 'subtle high angle, 15° down' }, { name: 'Dramatic 45°', insert: 'dramatic high angle, 45° down' }, { name: 'Overhead', insert: 'directly overhead, 90° top-down' }] },
      { name: 'DUTCH', label: 'Dutch Tilt', effect: 'Off-kilter world. Creates unease, psychological instability, or threat. Use sparingly — loses impact fast.', insert: 'dutch tilt angle', subOptions: [{ name: '5° subtle', insert: 'dutch tilt, subtle 5°' }, { name: '25° medium', insert: 'dutch tilt, medium 25°' }, { name: '45° extreme', insert: 'dutch tilt, extreme 45°' }] },
      { name: 'POV', label: 'Point of View', effect: 'Puts the audience literally behind the eyes of a character. Creates extreme empathy or extreme discomfort.', insert: 'POV angle, from character perspective', subOptions: [{ name: 'Binocular POV', insert: 'binocular/scope POV' }, { name: 'Handheld POV', insert: 'handheld walking POV' }, { name: 'Hidden POV', insert: 'voyeuristic hidden POV' }] },
      { name: 'OVH', label: 'Overhead', effect: 'Subjects become patterns or pieces on a board. Removes humanity — creates surveillance or fate.', insert: "overhead bird's-eye", subOptions: [{ name: '100% top-down', insert: 'true overhead, 100% top-down' }, { name: 'Near aerial', insert: 'near-aerial high angle, slight forward tilt' }, { name: 'Drone look', insert: 'drone-style overhead perspective' }] },
      { name: 'WORM', label: "Worm's Eye", effect: "Extreme authority or scale. The subject towers over the viewer. Powerful because it's so rarely used.", insert: "worm's eye angle", subOptions: [{ name: 'Ground level', insert: "ground-level worm's eye, extreme" }, { name: 'Shoe level', insert: 'shoe-level perspective looking up full figure' }, { name: 'Floor tilt', insert: 'floor-skimming upward tilt' }] },
      { name: 'PROFL', label: 'Profile Angle', effect: 'Pure observation without acknowledgment. The subject is unaware or ignores the audience completely.', insert: 'pure profile angle, 90 degree side', subOptions: [{ name: 'Tight profile', insert: 'tight pure profile' }, { name: 'Silhouette profile', insert: 'pure profile in silhouette' }] },
    ],
  },
  'Framing?': {
    context: 'Where you place the subject tells the audience where to look — and what the subject means.',
    options: [
      { name: 'THIRDS', label: 'Rule of Thirds', effect: 'Natural, dynamic tension. Subject slightly off-center with visual breathing room in their eyeline direction.', insert: 'rule of thirds framing', subOptions: [{ name: 'Left third', insert: 'subject left third, eyeline leads right' }, { name: 'Right third', insert: 'subject right third, eyeline leads left' }, { name: 'Upper third', insert: 'subject upper third, weighted top of frame' }] },
      { name: 'CENTER', label: 'Centered / Symmetric', effect: "Confrontational and iconic. The subject can't be avoided. Conveys inevitability and control.", insert: 'centered, symmetrical framing', subOptions: [{ name: 'Kubrick', insert: 'Kubrickian one-point centered perspective' }, { name: 'Wes Anderson', insert: 'Wes Anderson flat symmetric centered framing' }, { name: 'Tight center', insert: 'tight center frame, no negative space' }] },
      { name: 'OTS', label: 'Over-the-Shoulder', effect: 'Grounds dialogue in physical space. Audience is behind one character, watching the other.', insert: 'over-the-shoulder framing', subOptions: [{ name: 'Tight OTS', insert: 'tight over-shoulder, ear visible in foreground' }, { name: 'Loose OTS', insert: 'loose over-shoulder, full profile foreground' }, { name: 'Dirty OTS', insert: 'dirty over-shoulder, blurred foreground face' }] },
      { name: 'POV', label: 'Point of View', effect: "The audience inhabits the character. Creates immediate empathy — or immediate horror — depending on what's seen.", insert: 'POV, first-person perspective', subOptions: [{ name: 'Walk POV', insert: 'walking POV, subtle bounce' }, { name: 'Search POV', insert: 'searching POV, scanning room' }, { name: 'Confront POV', insert: 'confrontation POV, character stares into lens' }] },
      { name: 'NEG', label: 'Negative Space', effect: 'Subject is small in frame. Empty space communicates isolation, weight of thought, or environment as character.', insert: 'subject in negative space', subOptions: [{ name: 'Sky dominant', insert: 'subject tiny, sky dominates frame' }, { name: 'Wall dominant', insert: 'subject isolated against empty wall' }, { name: 'Floor dominant', insert: 'subject small, floor or ground dominates' }] },
    ],
  },
  // ── SUBJECT ──
  'Who / what is in frame?': {
    context: 'What your camera points at is your story. The choice of subject defines what the scene is about.',
    options: [
      { name: 'LEAD', label: 'Single Subject', effect: 'All attention on one person or thing. Concentration, vulnerability, and focus.', insert: 'single subject, isolated in frame', subOptions: [{ name: 'Hero', insert: 'single protagonist, dominant in frame' }, { name: 'Vulnerable', insert: 'single subject, small and vulnerable' }, { name: 'Commanding', insert: 'single subject, commanding the frame' }] },
      { name: '2-SHOT', label: 'Two-Shot', effect: 'Relationship visible in one frame. Power dynamic and tension readable without a cut.', insert: 'two-shot, both subjects in frame', subOptions: [{ name: 'Facing each other', insert: 'two-shot, subjects facing each other' }, { name: 'Side by side', insert: 'two-shot, subjects side by side' }, { name: 'One behind', insert: 'two-shot, one figure behind the other' }] },
      { name: 'GROUP', label: 'Ensemble', effect: 'Complex social dynamics. Multiple faces create shifting attention and community or conflict.', insert: 'ensemble, multiple subjects', subOptions: [{ name: '3-shot', insert: 'three-shot group' }, { name: 'Small group', insert: 'small group, 4-5 people' }, { name: 'Crowd', insert: 'crowd, many faces visible' }] },
      { name: 'DETAIL', label: 'Detail / Prop', effect: 'The object carries meaning. A ring, a photo, a weapon. When the camera looks at it, so does the audience.', insert: 'detail shot, prop in focus', subOptions: [{ name: 'Hand detail', insert: 'detail shot on hands' }, { name: 'Eye detail', insert: 'detail shot on eyes' }, { name: 'Object only', insert: 'isolated object, no body in frame' }] },
      { name: 'ENV', label: 'Environment Only', effect: 'No human presence. Location as character. Sets tone before anyone enters.', insert: 'empty environment, no subject present', subOptions: [{ name: 'Empty room', insert: 'empty interior, no subjects' }, { name: 'Empty street', insert: 'empty exterior urban street' }, { name: 'Empty landscape', insert: 'empty landscape, no human presence' }] },
      { name: 'MACRO', label: 'Macro Texture', effect: 'Removes all context, turning surface into landscape.', insert: 'macro surface detail, no context', subOptions: [{ name: 'Fabric', insert: 'macro texture of fabric' }, { name: 'Skin', insert: 'macro detail of skin' }, { name: 'Earth/Stone', insert: 'macro detail of earth/stone' }] },
    ],
  },
  'Pose / position?': {
    context: 'Body language speaks before dialogue. Physicality reveals what characters try to conceal.',
    options: [
      { name: 'STAND', label: 'Standing / Upright', effect: 'Alert, ready, or presenting. Upright posture signals control and engagement.', insert: 'standing, upright posture', subOptions: [{ name: 'Relaxed', insert: 'standing, relaxed stance, weight balanced' }, { name: 'Tense/alert', insert: 'standing, tense alert posture, coiled' }, { name: 'Confrontational', insert: 'standing, confrontational forward lean' }] },
      { name: 'SIT', label: 'Seated / Still', effect: 'Settled or trapped. Stillness can mean peace or paralysis depending on context.', insert: 'seated, still', subOptions: [{ name: 'Leaning forward', insert: 'seated, leaning forward, engaged' }, { name: 'Slumped', insert: 'seated, slumped back, defeated' }, { name: 'Upright formal', insert: 'seated, rigidly upright, formal' }] },
      { name: 'WALK', label: 'Walking / Moving', effect: 'Purposeful or aimless — the speed and direction tell the story.', insert: 'walking, in motion', subOptions: [{ name: 'Toward camera', insert: 'walking directly toward camera' }, { name: 'Away', insert: 'walking away from camera' }, { name: 'Lateral', insert: 'walking laterally past camera' }] },
      { name: 'BACK', label: 'Back to Camera', effect: 'Mystery, departure, or rejection. The audience sees what the character faces, not their expression.', insert: 'back to camera, facing away', subOptions: [{ name: 'Fully away', insert: 'fully turned away, no face visible' }, { name: 'Head turn', insert: 'body away, head barely turned back' }, { name: 'Over shoulder', insert: 'back to camera, looking over shoulder' }] },
      { name: 'PROFIL', label: 'Profile / Side-On', effect: 'Observation without acknowledgment. Contemplative or isolated.', insert: 'profile, side-on to camera', subOptions: [{ name: 'Left profile', insert: 'left profile, nose points left' }, { name: 'Right profile', insert: 'right profile, nose points right' }, { name: '3/4 profile', insert: '3/4 profile, slight turn from side' }] },
    ],
  },
  'Expression?': {
    context: 'Expression is the primary emotional signal. It tells the audience what to feel.',
    options: [
      { name: 'NEUT', label: 'Neutral / Unreadable', effect: 'Ambiguity the audience fills in. Uncomfortable and magnetic when held long enough.', insert: 'neutral expression, unreadable', subOptions: [{ name: 'Blank', insert: 'completely blank expression, unreadable' }, { name: 'Slight tension', insert: 'neutral with slight tension around jaw' }, { name: 'Far-off gaze', insert: 'neutral expression, distant unfocused gaze' }] },
      { name: 'DET', label: 'Determined / Resolved', effect: 'Intent and agency. The character has decided something. Audiences respect this.', insert: 'determined, set jaw expression', subOptions: [{ name: 'Jaw set', insert: 'jaw set, forward gaze, determined' }, { name: 'Eyes focused', insert: 'narrowed focused eyes, resolved' }, { name: 'Subtle smile', insert: 'slight determined smile, knowing' }] },
      { name: 'FEAR', label: 'Fear / Dread', effect: 'Primal. The audience mirrors this instinctively — their own threat response activates.', insert: 'fearful expression, wide eyes', subOptions: [{ name: 'Wide eyes', insert: 'wide eyes, frozen in fear' }, { name: 'Trembling', insert: 'trembling chin, barely holding it together' }, { name: 'Eyes darting', insert: 'eyes scanning frantically, panicked' }] },
      { name: 'GRIEF', label: 'Grief / Sorrow', effect: "The most empathy-generating expression in film. Audiences lean toward it.", insert: 'grief, sorrowful expression', subOptions: [{ name: 'Tears', insert: 'tears streaming, raw grief' }, { name: 'Eyes shut', insert: 'eyes tightly closed, overwhelmed with grief' }, { name: 'Lip trembling', insert: 'lip trembling, suppressing crying' }] },
      { name: 'STOIC', label: 'Stoic / Concealed', effect: 'What is being held back? Restraint generates more tension than overt emotion.', insert: 'stoic, emotion concealed', subOptions: [{ name: 'Forced calm', insert: 'forced composure, barely controlled' }, { name: 'Tight jaw', insert: 'jaw clenched, stoic control' }, { name: 'Cold eyes', insert: 'cold emotionless eyes, deliberate blankness' }] },
      { name: 'JOY', label: 'Genuine Joy', effect: 'Rare in film — which is why it lands so hard when it appears authentically.', insert: 'genuine joy, open expression', subOptions: [{ name: 'Full smile', insert: 'full genuine smile, eyes crinkle' }, { name: 'Laughing', insert: 'mid-laugh, mouth open, eyes closed' }, { name: 'Surprised delight', insert: 'surprised delighted expression, eyebrows raised' }] },
      { name: 'PARAN', label: 'Paranoia / Suspicion', effect: 'Scanning the environment, lack of trust in what is seen.', insert: 'paranoid expression, suspicious', subOptions: [{ name: 'Side-eye', insert: 'suspicious side-eye darting' }, { name: 'Uneasy', insert: 'uneasy tightened expression' }, { name: 'Hyper-vigilant', insert: 'hyper-vigilant, eyes wide and alert' }] },
    ],
  },
  'Wardrobe details?': {
    context: "Clothing is visual shorthand for character. What they wear and how they wear it tells a story before they speak.",
    options: [
      { name: 'WORN', label: 'Worn / Distressed', effect: 'Life has happened to this person. Struggle, history, and authenticity.', insert: 'worn, distressed clothing, lived-in texture', subOptions: [{ name: 'Torn jacket', insert: 'torn worn jacket, frayed edges' }, { name: 'Stained fabric', insert: 'stained fabric, visible history' }, { name: 'Patched', insert: 'patched and repaired clothing, long use' }] },
      { name: 'SHARP', label: 'Sharp / Tailored', effect: 'Control, ambition, or armor. The person who dresses perfectly may be hiding something.', insert: 'sharp tailored clothing, polished', subOptions: [{ name: 'Dark suit', insert: 'sharp dark suit, precisely fitted' }, { name: 'Crisp white', insert: 'crisp white collar, pressed shirt' }, { name: 'Overcoat', insert: 'well-tailored overcoat, authority' }] },
      { name: 'CASUAL', label: 'Casual / Relaxed', effect: 'Off-guard. The real person, not the performed version.', insert: 'casual, relaxed clothing', subOptions: [{ name: 'T-shirt & jeans', insert: 'simple t-shirt and jeans, everyday' }, { name: 'Hoodie', insert: 'hoodie, casual comfort' }, { name: 'Soft layers', insert: 'casual soft layers, comfortable fabrics' }] },
      { name: 'UNIFORM', label: 'Uniform / Institutional', effect: 'Identity subsumed into a role. Military, medical, corporate — the person serves the system.', insert: 'uniform, institutional dress', subOptions: [{ name: 'Military', insert: 'military dress uniform' }, { name: 'Medical', insert: 'scrubs, medical uniform' }, { name: 'Corporate', insert: 'corporate uniform, institutional suit' }] },
      { name: 'CONTRAST', label: 'Contrast with Setting', effect: 'A suit in a slum, rags in a palace — visual dissonance that signals displacement or danger.', insert: 'clothing contrasts sharply with environment', subOptions: [{ name: 'Formal in wild', insert: 'formal clothing in rough natural environment' }, { name: 'Rags in luxury', insert: 'threadbare clothing in opulent setting' }, { name: 'Bright in dark', insert: 'bright clothing surrounded by dark environment' }] },
    ],
  },
  // ── ACTION ──
  'What happens?': {
    context: 'Every moment should change something — even if only what the audience knows.',
    options: [
      { name: 'PHYS', label: 'Physical Action', effect: 'A body doing something. Running, fighting, building, breaking. Kinetic and visceral.', insert: 'physical action, body in motion', subOptions: [{ name: 'Sprint/run', insert: 'sprinting, full run, urgent' }, { name: 'Fight', insert: 'physical confrontation, struggle' }, { name: 'Deliberate walk', insert: 'slow deliberate walking, purposeful' }] },
      { name: 'REACT', label: 'Emotional Reaction', effect: "The character receives information and responds. Often more powerful than the action that caused it.", insert: 'emotional reaction, internal response', subOptions: [{ name: 'Shock', insert: 'stunned reaction, sudden shock' }, { name: 'Collapse', insert: 'physical collapse under emotional weight' }, { name: 'Suppressed', insert: 'suppressed emotion, visibly holding back' }] },
      { name: 'REVEAL', label: 'Discovery / Reveal', effect: 'Something previously unknown becomes visible — to the character, the audience, or both.', insert: 'discovery, revelation moment', subOptions: [{ name: 'Turn around', insert: 'character turns to reveal face' }, { name: 'Door opens', insert: 'door opens, revealing what was behind it' }, { name: 'Uncover', insert: 'something uncovered or unveiled' }] },
      { name: 'WAIT', label: 'Waiting / Stillness', effect: "Nothing happens — but anticipation builds. The audience waits with the character.", insert: 'stillness, anticipatory waiting', subOptions: [{ name: 'Watching door', insert: 'watching a door, waiting for it to open' }, { name: 'Check phone', insert: 'checking phone compulsively, waiting' }, { name: 'Stare into space', insert: 'staring into space, lost in thought' }] },
      { name: 'DEPART', label: 'Departure / Exit', effect: 'Someone or something leaves. The frame after they go says everything.', insert: 'departure, character exits frame', subOptions: [{ name: 'Walk away', insert: 'character walks away from camera' }, { name: 'Car drives off', insert: 'vehicle departing, receding into distance' }, { name: 'Door closes', insert: 'door closes behind departing figure' }] },
    ],
  },
  'Speed / pacing?': {
    context: 'Time is one of cinema\'s most powerful tools. You can stretch it, compress it, or shatter it.',
    options: [
      { name: 'REAL', label: 'Real-Time', effect: 'Clock-accurate. Tension builds because the audience feels every second passing.', insert: 'real-time pacing', subOptions: [{ name: 'Exact clock time', insert: 'exact real-time, clock accurate pacing' }, { name: 'Slightly quick', insert: 'slightly accelerated, tighter than real' }] },
      { name: 'SLO', label: 'Slow Motion', effect: 'Elevates the moment to mythic status. Used for beauty, grief, violence, or revelation.', insert: 'slow motion', subOptions: [{ name: 'Subtle 60fps', insert: 'subtle slow motion, 60fps' }, { name: 'Deep 120fps', insert: 'deep slow motion, 120fps' }, { name: 'Ultra 240fps+', insert: 'ultra slow motion, 240fps+' }] },
      { name: 'RAMP', label: 'Speed Ramp', effect: 'Starts fast, slows to slo-mo on the key beat. Punctuates the most important moment.', insert: 'speed ramp, fast to slow-motion', subOptions: [{ name: 'Run → slo', insert: 'speed ramp from running to slow-motion peak' }, { name: 'Impact slo', insert: 'speed ramp on impact moment' }, { name: 'Climax hold', insert: 'ramp to near-freeze on climax frame' }] },
      { name: 'FAST', label: 'Accelerated', effect: 'Time passes visibly. Used for urgency, time-lapse montage, or comic energy.', insert: 'accelerated, fast motion', subOptions: [{ name: 'Timelapse sky', insert: 'time-lapse, clouds racing' }, { name: 'Crowd fwd', insert: 'crowd time-lapse, people blur past' }, { name: 'Clock rush', insert: 'accelerated motion showing time passing' }] },
      { name: 'FREEZE', label: 'Freeze Frame', effect: 'Time stops completely. Often held on a moment of consequence — the last image frozen.', insert: 'freeze frame, held moment', subOptions: [{ name: 'Freeze on face', insert: 'freeze frame on face at peak moment' }, { name: 'Freeze on action', insert: 'freeze frame at peak of physical action' }, { name: 'Final frame', insert: 'final freeze frame, scene ends on still' }] },
    ],
  },
  'Key beat?': {
    context: 'Every scene exists to reach one moment. Everything before it is setup — this is what you\'re building toward.',
    options: [
      { name: 'PEAK', label: 'Climax / Peak', effect: "The scene's entire energy arrives here. Camera and performance should feel the weight.", insert: 'climax, peak of scene', subOptions: [{ name: 'Physical peak', insert: 'climax of physical action, maximum kinetic' }, { name: 'Emotional peak', insert: 'peak emotional moment, maximum feeling' }, { name: 'Conflict peak', insert: 'confrontation reaches boiling point' }] },
      { name: 'TURN', label: 'Turning Point', effect: 'Something shifts irrevocably. The character — or the audience — understands something new.', insert: 'turning point, pivotal shift', subOptions: [{ name: 'Info revealed', insert: 'information revealed that changes everything' }, { name: 'Decision made', insert: 'character makes irreversible decision' }, { name: 'Betrayal moment', insert: 'moment of betrayal, shift in loyalty' }] },
      { name: 'QUIET', label: 'Quiet Beat', effect: "Nothing happens — but everything is felt. The scene breathes. Often the most remembered beat.", insert: 'quiet emotional beat, held stillness', subOptions: [{ name: 'After storm', insert: 'quiet beat after intense action, exhale' }, { name: 'Before storm', insert: 'quiet loaded beat before tension breaks' }, { name: 'Shared silence', insert: 'two characters in meaningful silence' }] },
      { name: 'REVL', label: 'Revelation', effect: 'Information releases to the audience. They re-read everything that came before.', insert: 'revelation, information release', subOptions: [{ name: 'Character learns', insert: 'character receives critical information' }, { name: 'Audience learns', insert: 'audience learns something character does not know' }, { name: 'Object revealed', insert: 'significant object revealed to camera' }] },
      { name: 'FIRST', label: 'First Look', effect: "The moment a character sees something for the first time. Their face is the shot.", insert: 'first look, moment of seeing', subOptions: [{ name: 'First sight', insert: 'character sees something for first time, face is the shot' }, { name: 'First contact', insert: 'first physical contact between characters' }, { name: 'Enter space', insert: 'character enters a significant space for first time' }] },
      { name: 'REALZ', label: 'Realization', effect: 'The internal click when the character understands everything. Often done with a push-in.', insert: 'moment of realization, internal shift', subOptions: [{ name: 'Dawning horror', insert: 'dawning realization of horror' }, { name: 'Sudden clarity', insert: 'sudden clarity, internal click' }] },
    ],
  },
  'Transition out?': {
    context: 'How you leave a scene is as expressive as how you enter it. The cut carries meaning.',
    options: [
      { name: 'HARD', label: 'Hard Cut', effect: 'Abrupt, rhythmic, modern. No transition at all — just the next thing. The default and the most common.', insert: 'hard cut to next scene', subOptions: [{ name: 'On the beat', insert: 'hard cut on the beat, rhythmic' }, { name: 'On action', insert: 'cut on action, mid-movement' }, { name: 'On last word', insert: 'cut on last word of dialogue' }] },
      { name: 'SMASH', label: 'Smash Cut', effect: 'Violent juxtaposition. Contrast between scenes creates the meaning — shock or dark humor.', insert: 'smash cut, jarring contrast', subOptions: [{ name: 'Sound smash', insert: 'smash cut with jarring sound contrast' }, { name: 'Light smash', insert: 'smash cut from dark to bright' }, { name: 'Tone smash', insert: 'smash cut from serious to absurd, tonal whiplash' }] },
      { name: 'DISS', label: 'Dissolve', effect: 'Time passes, or things blend. Soft and retrospective. Signals memory or gentle passage.', insert: 'dissolve transition', subOptions: [{ name: 'Slow dissolve', insert: 'slow dissolve, time passing gently' }, { name: 'Quick dissolve', insert: 'quick dissolve, brief memory flash' }, { name: 'Double expose', insert: 'dissolve with double-exposure overlap' }] },
      { name: 'FADE', label: 'Fade to Black', effect: 'The scene ends completely. Finality, sleep, death, or chapter close.', insert: 'fade to black', subOptions: [{ name: 'Fade black', insert: 'fade to black, complete ending' }, { name: 'Fade white', insert: 'fade to white, death or transcendence' }, { name: 'Very slow fade', insert: 'very slow fade, prolonged emotional close' }] },
      { name: 'MATCH', label: 'Match Cut', effect: 'Shape, movement, or color rhymes between scenes. One of cinema\'s most elegant tools.', insert: 'match cut, visual rhyme', subOptions: [{ name: 'Shape match', insert: 'match cut on similar shape between scenes' }, { name: 'Motion match', insert: 'match cut on matching movement' }, { name: 'Color match', insert: 'match cut on dominant color' }] },
      { name: 'L-CUT', label: 'L-Cut / J-Cut', effect: "Sound precedes or trails the image. The most cinematic way to cut dialogue — keeps scenes breathing.", insert: 'L-cut, sound leads picture', subOptions: [{ name: 'L-cut', insert: 'L-cut, audio from current scene continues into next visually' }, { name: 'J-cut', insert: 'J-cut, audio from next scene begins before visual cut' }] },
    ],
  },
  // ── ENVIRONMENT ──
  'Location / setting?': {
    context: "Location is not backdrop — it's a character. Where the scene happens shapes everything in it.",
    options: [
      { name: 'INT', label: 'Interior', effect: 'Controlled, confined. Can feel safe, claustrophobic, or intimate depending on execution.', insert: 'interior, enclosed space', subOptions: [{ name: 'Bedroom', insert: 'interior bedroom, intimate private space' }, { name: 'Living room', insert: 'interior living room, domestic setting' }, { name: 'Kitchen', insert: 'interior kitchen, functional domestic' }, { name: 'Corridor', insert: 'interior corridor, claustrophobic and directional' }] },
      { name: 'EXT', label: 'Exterior', effect: 'Exposed, open, subject to weather and natural light. Characters are smaller against the world.', insert: 'exterior, outdoor location', subOptions: [{ name: 'City street', insert: 'exterior urban street, city environment' }, { name: 'Countryside', insert: 'exterior countryside, rural' }, { name: 'Rooftop', insert: 'exterior rooftop, elevated urban' }, { name: 'Parking lot', insert: 'exterior parking lot, empty and exposed' }] },
      { name: 'URBAN', label: 'Urban / City', effect: 'Energy, anonymity, noise. The city is indifferent to your characters — which can be devastating.', insert: 'urban setting, city environment', subOptions: [{ name: 'Alley', insert: 'narrow urban alley, confined and isolated' }, { name: 'Intersection', insert: 'busy street intersection, chaotic and crowded' }, { name: 'Underground', insert: 'subway or underground urban space' }] },
      { name: 'NATURE', label: 'Natural Landscape', effect: "Nature dwarfs human problems — or makes them feel appropriate to the scale of the world.", insert: 'natural landscape, wilderness', subOptions: [{ name: 'Forest', insert: 'deep forest, canopy and roots' }, { name: 'Coastline', insert: 'coastline, sea meeting land' }, { name: 'Open field', insert: 'open field, unbroken horizon' }] },
      { name: 'INDUST', label: 'Industrial', effect: 'Inhuman scale, dehumanizing geometry. Characters feel like components in a machine.', insert: 'industrial environment, machinery and concrete', subOptions: [{ name: 'Warehouse', insert: 'industrial warehouse, vast and cold' }, { name: 'Factory floor', insert: 'active factory floor, machinery everywhere' }, { name: 'Concrete grid', insert: 'concrete brutalist architecture, geometric and oppressive' }] },
    ],
  },
  'Time of day?': {
    context: 'Light changes everything. The same location tells a completely different story at different times of day.',
    options: [
      { name: 'DAWN', label: 'Dawn / Golden Hour', effect: 'Warm and fragile — hopeful, or the light before a terrible day begins. Used for beginnings and final moments alike.', insert: 'dawn, golden hour light', subOptions: [{ name: 'Pre-dawn', insert: 'pre-dawn, just before first light' }, { name: 'Sunrise', insert: 'sunrise, first direct golden rays' }, { name: 'Early morning', insert: 'early morning, low soft warm light' }] },
      { name: 'DAY', label: 'Midday / Harsh Sun', effect: 'Exposed, shadowless, brutal. Nothing hides in flat midday light.', insert: 'midday, harsh overhead sun', subOptions: [{ name: 'White sky', insert: 'overcast midday, flat white sky' }, { name: 'Brutal sun', insert: 'harsh direct midday sun, bleached shadows' }, { name: 'Heat haze', insert: 'midday with heat haze and shimmer' }] },
      { name: 'AFTN', label: 'Late Afternoon', effect: 'Long shadows at low angle. Warm but running out. Feels like time is slipping away.', insert: 'late afternoon, low warm light', subOptions: [{ name: 'Long shadows', insert: 'late afternoon, dramatically long shadows' }, { name: 'Slanted rays', insert: 'slanted golden afternoon rays through windows' }, { name: 'Near dusk', insert: 'late afternoon approaching dusk, colors shifting' }] },
      { name: 'MAGIC', label: 'Magic Hour / Sunset', effect: "Short-lived and beautiful. The most emotional light in cinema. Used for scenes that must be felt.", insert: 'magic hour, sunset light', subOptions: [{ name: 'Pure magic', insert: 'pure magic hour, 20 min after sunset' }, { name: 'Dramatic sunset', insert: 'dramatic sunset sky, orange and pink' }, { name: 'Last light', insert: 'final last light, barely visible sun' }] },
      { name: 'BLUE', label: 'Dusk / Blue Hour', effect: 'Cool, melancholic, transitional. The world has turned from warm to cold — sense of ending.', insert: 'dusk, blue hour', subOptions: [{ name: 'Blue hour', insert: 'true blue hour, after sunset cool blue' }, { name: 'Dusk sky', insert: 'dusk transition, sky still faintly glowing' }, { name: 'Night edge', insert: 'edge of night, last ambient sky light' }] },
      { name: 'NIGHT', label: 'Night', effect: 'Defined by what you choose to illuminate. Secrets, danger, freedom, intimacy.', insert: 'night, artificial light sources', subOptions: [{ name: 'Streetlights', insert: 'night, urban streetlights, pools of orange' }, { name: 'Neon night', insert: 'night, neon signs and wet reflections' }, { name: 'Near darkness', insert: 'near total darkness, minimal light sources' }] },
    ],
  },
  'Weather?': {
    context: "Weather is mood made visible. It's the cheapest production design decision with the biggest emotional return.",
    options: [
      { name: 'CLEAR', label: 'Clear / Blue Sky', effect: 'Neutral or optimistic. But terrible things can happen in beautiful weather — the contrast is its own statement.', insert: 'clear sky, bright conditions', subOptions: [{ name: 'Blue sky', insert: 'clear deep blue sky, perfect visibility' }, { name: 'Sunny warm', insert: 'bright sunny warm day' }, { name: 'Windy clear', insert: 'clear but windy, movement in frame' }] },
      { name: 'OCAST', label: 'Overcast', effect: 'Soft, even, shadowless. Melancholic, restrained, and honest. The mood of aftermath.', insert: 'overcast, soft diffused light', subOptions: [{ name: 'Heavy grey', insert: 'heavy overcast, white-grey sky' }, { name: 'Thin cloud', insert: 'lightly overcast, thin cloud diffusion' }, { name: 'Pre-rain', insert: 'charged pre-rain atmosphere, heavy clouds' }] },
      { name: 'RAIN', label: 'Rain', effect: "Cinema's most reliable emotional amplifier. Grief, longing, cleansing, chaos.", insert: 'rain, wet surfaces and reflections', subOptions: [{ name: 'Light mist', insert: 'light rain, misting and damp' }, { name: 'Heavy downpour', insert: 'heavy downpour, sheets of rain' }, { name: 'Puddle reflections', insert: 'rain aftermath, reflective puddles, wet surfaces' }] },
      { name: 'FOG', label: 'Fog / Mist', effect: 'Obscures the world. Creates mystery, isolation, and the sense that something is hidden just out of frame.', insert: 'fog, mist, reduced visibility', subOptions: [{ name: 'Thin mist', insert: 'thin morning mist, partial visibility' }, { name: 'Dense fog', insert: 'dense fog, figures disappear at 10m' }, { name: 'Fog & light beams', insert: 'fog with visible light beams cutting through' }] },
      { name: 'SNOW', label: 'Snow', effect: 'Silence, purity, isolation, or death depending on context. Snow muffles the world.', insert: 'snow, white landscape', subOptions: [{ name: 'Falling snow', insert: 'snow actively falling, flakes visible' }, { name: 'Fresh ground', insert: 'fresh snow on ground, pristine white' }, { name: 'Blizzard', insert: 'blizzard, extreme reduced visibility' }] },
    ],
  },
  'Era / period?': {
    context: "When your story is set changes how the audience reads every costume, prop, and behavior.",
    options: [
      { name: 'NOW', label: 'Contemporary', effect: 'Immediate and relatable. No period distance — the audience is in the same world.', insert: 'contemporary, present day', subOptions: [{ name: 'Urban now', insert: 'contemporary urban, present day city' }, { name: 'Suburban now', insert: 'contemporary suburban setting' }, { name: 'Hyper-now', insert: 'hyper-contemporary, cutting-edge present' }] },
      { name: '70s', label: '1970s', effect: 'Grain, earth tones, natural chaos. The decade of New Hollywood — personal, imperfect, alive.', insert: '1970s aesthetic, warm film grain', subOptions: [{ name: 'Early 70s', insert: 'early 1970s, bell-bottoms and earth tones' }, { name: 'Mid 70s', insert: 'mid 1970s New Hollywood energy' }, { name: 'Late 70s', insert: 'late 1970s, pre-punk grit' }] },
      { name: '80s', label: '1980s', effect: 'Neon, synth, ambition. High-contrast and stylized — feels both retro and timeless.', insert: '1980s, neon and synth aesthetic', subOptions: [{ name: 'Early 80s', insert: 'early 1980s, post-disco neon beginning' }, { name: 'Peak 80s', insert: 'peak 1980s, full neon and synth' }, { name: 'Late 80s', insert: 'late 1980s, pre-grunge shift' }] },
      { name: 'Y2K', label: 'Y2K / Early 2000s', effect: 'Plastic, digital, optimistic and anxious at once. Specific nostalgia for a generation.', insert: 'Y2K aesthetic, early 2000s', subOptions: [{ name: 'Y2K 1999-2001', insert: 'Y2K aesthetic, 1999-2001' }, { name: 'Early 2000s', insert: 'early 2000s, plastic and digital' }, { name: 'Mid 2000s', insert: 'mid 2000s, emo and indie era' }] },
      { name: 'NRFTR', label: 'Near Future', effect: 'Familiar but wrong. Small technological differences that make the world feel slightly off.', insert: 'near future, 10-20 years ahead', subOptions: [{ name: '10yr ahead', insert: 'near future, 10 years ahead, subtle tech shifts' }, { name: '20yr ahead', insert: 'near future, 20 years, visible tech shift' }, { name: 'Retro-future', insert: 'retro-futurism, past vision of the future' }] },
    ],
  },
  // ── LIGHTING ──
  'Key light direction?': {
    context: 'Where your key light comes from defines the shadow — and shadow is where drama lives.',
    options: [
      { name: 'FRONT', label: 'Front / Flat', effect: 'Even light, no shadow. Clinical and exposed. The subject has nowhere to hide.', insert: 'front-lit, flat lighting', subOptions: [{ name: 'On-axis flat', insert: 'front-lit, on-axis, completely flat' }, { name: 'Beauty light', insert: 'frontal beauty light, slight above' }, { name: 'Slight angle', insert: 'front-lit with slight 15° angle' }] },
      { name: 'REMBR', label: '45° Rembrandt', effect: 'The classic portrait light. Three-dimensional and human. A small triangle of light on the shadow-side cheek.', insert: '45° Rembrandt lighting', subOptions: [{ name: 'Classic 45°', insert: 'classic Rembrandt 45° key light, eye triangle' }, { name: 'Butterfly', insert: 'butterfly/paramount light, shadow under nose' }, { name: 'Loop lighting', insert: 'loop lighting, small nose shadow drops downward' }] },
      { name: 'SPLIT', label: 'Side / Split', effect: "Half the face in shadow. Duality, internal conflict, concealment. What are they not showing?", insert: 'side-split lighting, half face in shadow', subOptions: [{ name: 'Exact 50/50', insert: 'exact 50/50 split, half face in complete shadow' }, { name: '60/40 near-split', insert: 'near-split, 60/40 light to shadow' }, { name: 'Edge light', insert: 'extreme edge lighting, tiny sliver illuminated' }] },
      { name: 'RIM', label: 'Back / Rim', effect: 'Separation from background. The character is outlined against their world. Heroic or mysterious.', insert: 'rim lighting, backlit', subOptions: [{ name: 'Strong rim', insert: 'strong rim light from behind, halo effect' }, { name: 'Kicker', insert: 'kicker rim on one shoulder and cheek' }, { name: 'Double rim', insert: 'double rim, backlit from both sides' }] },
      { name: 'UNDER', label: 'Under / Up Light', effect: "Horror's signature. Unnatural shadow direction creates immediate, deep unease.", insert: 'under-light, upward light source', subOptions: [{ name: 'Direct under', insert: 'direct under-light from chin height' }, { name: 'Floor bounce', insert: 'floor-bounce upward, horror style' }, { name: 'Warm torch', insert: 'warm upward light, campfire or torch source' }] },
      { name: 'TOP', label: 'Top / Down', effect: 'Oppressive and dramatic. Noir interrogation. Weight from above.', insert: 'top-down overhead lighting', subOptions: [{ name: 'Direct overhead', insert: 'direct overhead top light, industrial' }, { name: 'Interrogation', insert: 'single strong overhead source, interrogation' }, { name: 'Soft halo', insert: 'soft overhead halo light, directional from above' }] },
    ],
  },
  'Quality (hard/soft)?': {
    context: 'Hard or soft light is a mood decision. Hard = conflict and exposure. Soft = warmth and intimacy.',
    options: [
      { name: 'HARD', label: 'Hard Light', effect: 'Direct source — harsh sun, bare bulb. Sharp, crisp shadows. Intense, dramatic, confrontational.', insert: 'hard light, sharp crisp shadows', subOptions: [{ name: 'Bare bulb', insert: 'hard bare bulb, industrial quality' }, { name: 'Direct sun', insert: 'direct harsh sunlight, natural hard' }, { name: 'Fresnel spot', insert: 'hard Fresnel spotlight, theatrical' }] },
      { name: 'SOFT', label: 'Soft Light', effect: 'Diffused — overcast, bounce, softbox. Gentle gradients, no harsh edges. Intimate and warm.', insert: 'soft, diffused light', subOptions: [{ name: 'Large softbox', insert: 'large softbox, even diffusion' }, { name: 'Bounce card', insert: 'bounced light, indirect soft fill' }, { name: 'Overcast sky', insert: 'overcast sky as natural giant softbox' }] },
      { name: 'MIXED', label: 'Mixed', effect: 'Complexity and realism. A soft key with a hard practical fill creates visual interest.', insert: 'mixed light quality, soft key and hard fill', subOptions: [{ name: 'Soft key/hard fill', insert: 'soft key with hard practical fill' }, { name: 'Window + spot', insert: 'soft window light with hard spotlight accent' }, { name: 'Natural + artificial', insert: 'mixed natural and artificial sources' }] },
      { name: 'CHRC', label: 'Chiaroscuro', effect: 'High conflict between deeply shadowed areas and intensely lit subjects. Classic painting style.', insert: 'chiaroscuro lighting, stark light and shadow contrast', subOptions: [{ name: 'Painterly', insert: 'painterly chiaroscuro, Caravaggio style' }, { name: 'Slit lighting', insert: 'slit of light across eyes only' }] },
    ],
  },
  'Color temp?': {
    context: 'Color temperature is emotional temperature. Warm feels human; cool feels clinical or threatening.',
    options: [
      { name: 'WARM', label: 'Warm ~3200K', effect: 'Orange-gold tones. Home, intimacy, firelight, nostalgia. The warmest light feels the most human.', insert: 'warm tungsten light, ~3200K', subOptions: [{ name: 'Tungsten 3200K', insert: 'tungsten warm, 3200K' }, { name: 'Candlelight 1800K', insert: 'candlelight warm, 1800K' }, { name: 'Sunset 2800K', insert: 'sunset orange light, 2800K' }] },
      { name: 'NEUT', label: 'Neutral ~5600K', effect: 'Balanced, truthful, neither warm nor cool. Transparent — the story sets the temperature.', insert: 'neutral daylight, ~5600K', subOptions: [{ name: 'Overcast 6000K', insert: 'overcast neutral daylight, 6000K' }, { name: 'Studio 5600K', insert: 'balanced studio daylight, 5600K' }, { name: 'Flash 5500K', insert: 'neutral electronic flash, 5500K' }] },
      { name: 'COOL', label: 'Cool ~7000K', effect: 'Blue-white. Clinical, isolated, cold, or futuristic. Warmth is absent by design.', insert: 'cool shade light, ~7000K', subOptions: [{ name: 'Open shade 7000K', insert: 'cool open shade, 7000K' }, { name: 'Blue sky 9000K', insert: 'clear blue sky reflection, 9000K' }, { name: 'Fluorescent 4000K', insert: 'fluorescent cool white, 4000K' }] },
      { name: 'MIX', label: 'Mixed Temps', effect: 'Multiple sources at different temperatures. Feels real — the world has multiple light sources.', insert: 'mixed color temperatures in scene', subOptions: [{ name: 'Warm interior/cool outside', insert: 'warm tungsten interior, cool daylight through window' }, { name: 'Day + neon', insert: 'daylight mixed with colored neon' }, { name: 'Many sources', insert: 'multiple light sources at different temperatures throughout' }] },
      { name: 'NEON', label: 'Neon / Colored', effect: 'Deliberate, expressive color. Non-naturalistic — used for mood, genre, or visual style.', insert: 'deliberate colored light, neon palette', subOptions: [{ name: 'Blue neon', insert: 'deliberate blue neon light' }, { name: 'Red neon', insert: 'deliberate red neon light' }, { name: 'Multi-color neon', insert: 'multi-color neon palette, club or street' }] },
    ],
  },
  'Practicals in scene?': {
    context: "Practicals are visible light sources in frame. They ground the scene in a real, inhabited world.",
    options: [
      { name: 'LAMP', label: 'Table / Floor Lamp', effect: 'Domestic and intimate. Creates pools of warm light — the world outside the lamp feels darker.', insert: 'practical table lamp, warm pool of light', subOptions: [{ name: 'Desk lamp', insert: 'desk lamp, directed pool of warm light' }, { name: 'Floor lamp', insert: 'floor standing lamp, ambient warm glow' }, { name: 'Bedside lamp', insert: 'bedside lamp, intimate low light' }] },
      { name: 'WINDOW', label: 'Window / Natural', effect: 'The most beautiful practical. Directional, soft, and real. Changes with time of day.', insert: 'window light as practical, natural source', subOptions: [{ name: 'Morning window', insert: 'morning window light, warm low angle' }, { name: 'Evening window', insert: 'evening window light, cool blue' }, { name: 'Rain window', insert: 'window with rain, light reflecting off wet glass' }] },
      { name: 'SCREEN', label: 'TV / Phone / Screen', effect: 'Cool blue flicker. Surveillance, isolation, and modernity. The character is lit by their world.', insert: 'screen light, TV or phone glow', subOptions: [{ name: 'TV glow', insert: 'television screen flicker, cool blue light on face' }, { name: 'Phone light', insert: 'phone screen light on face in darkness' }, { name: 'Monitor array', insert: 'multiple monitor screens, blue-white glow' }] },
      { name: 'CANDLE', label: 'Candle / Flame', effect: 'Primal, intimate, and precarious. Flame light is alive — it moves, it can go out.', insert: 'candlelight, open flame practical', subOptions: [{ name: 'Single candle', insert: 'single candle, intimate warm'}, { name: 'Many candles', insert: 'many candles, scene lit by flame alone' }, { name: 'Flickering', insert: 'candle flickering, barely alive, unstable light' }] },
      { name: 'NEON', label: 'Neon Sign', effect: 'Hard, colored, commercial. Places the scene in a specific urban world.', insert: 'neon sign practical, colored commercial light', subOptions: [{ name: 'Red sign', insert: 'red neon sign practical' }, { name: 'Blue neon', insert: 'blue neon sign, clinical or cinematic' }, { name: 'Multi-color', insert: 'multi-color neon signs, urban visual noise' }] },
    ],
  },
  // ── TEXTURE ──
  'Film look / grain?': {
    context: 'Grain is not a flaw — it\'s a choice. It signals time period, authenticity, and emotional texture.',
    options: [
      { name: 'CLEAN', label: 'Clean Digital', effect: 'Crisp, modern, hyperreal. Can feel clinical or documentary — present-tense and unfiltered.', insert: 'clean digital, no grain', subOptions: [{ name: 'Sharp 4K', insert: 'sharp 4K digital, modern aesthetic' }, { name: 'Clinical sterile', insert: 'hyper-clean digital, sterile' }, { name: 'RAW capture', insert: 'clean digital RAW, no processing artifacts' }] },
      { name: 'FINE', label: 'Fine Grain ~ISO400', effect: 'Subtle texture. Quality film photography. Warm presence without distraction.', insert: 'fine film grain, ISO 400', subOptions: [{ name: 'Kodak 400', insert: 'fine grain, Kodak Portra 400 style' }, { name: 'Fuji 400H', insert: 'fine film grain, Fuji 400H style' }, { name: 'Classic fine', insert: 'classic fine grain, quality 400 ISO look' }] },
      { name: 'HEAVY', label: 'Heavy Grain ~ISO3200', effect: 'Raw, urgent, documentary energy. Feels lived-in and real. Often paired with handheld.', insert: 'heavy grain, high ISO film look', subOptions: [{ name: 'Pushed 3200', insert: 'pushed heavy grain, 3200 ISO pushed' }, { name: 'Night push', insert: 'heavy grain night footage, extreme push' }, { name: 'War doc grain', insert: 'heavy grain, wartime documentary aesthetic' }] },
      { name: '16MM', label: '16mm Film', effect: 'Counter-culture, indie, intimate. The look of New Hollywood and documentary realism.', insert: '16mm film scan, visible grain and softness', subOptions: [{ name: '16mm indie', insert: '16mm film scan, indie drama aesthetic' }, { name: '16mm New Wave', insert: '16mm New Wave, French New Wave aesthetic' }, { name: 'Super 16', insert: 'Super 16 film, slightly wider frame' }] },
      { name: 'VHS', label: 'VHS / Video', effect: 'Nostalgia, memory, home footage. Signals a specific time and emotional register.', insert: 'VHS video look, tape artifacts', subOptions: [{ name: 'Hi8 90s', insert: 'Hi8 camcorder quality, early 90s aesthetic' }, { name: 'VHS tape', insert: 'VHS tape quality, visible tape artifacts' }, { name: 'Found footage', insert: 'VHS found footage style, degraded video' }] },
    ],
  },
  'Lens character?': {
    context: 'The lens personality shapes the audience\'s relationship to the image — clinical vs. dreamy, modern vs. vintage.',
    options: [
      { name: 'SHARP', label: 'Clinical / Sharp', effect: 'Modern, technical, unromantic. Every detail is exposed. Can feel cold or authoritative.', insert: 'clinical sharp lens, modern glass', subOptions: [{ name: 'Modern Zeiss', insert: 'clinical Zeiss modern lens, zero aberration' }, { name: 'L-series', insert: 'Canon L-series clinical sharpness' }, { name: 'Zero distortion', insert: 'perfect rectilinear, no aberration' }] },
      { name: 'VNTG', label: 'Vintage Glass', effect: 'Flare, aberration, softness at edges. Imperfection adds warmth and humanity.', insert: 'vintage glass, lens flare and aberration', subOptions: [{ name: 'Cooke Panchro', insert: 'vintage Cooke Speed Panchro, warm and soft' }, { name: 'Old Nikkor', insert: 'vintage Nikkor glass, slight chromatic fringing' }, { name: 'Soviet swirl', insert: 'Soviet vintage lens, swirly bokeh and character' }] },
      { name: 'ANAM', label: 'Anamorphic', effect: 'Oval bokeh, horizontal lens flares. The language of prestige cinema — wide and epic.', insert: 'anamorphic lens, oval bokeh, horizontal flares', subOptions: [{ name: 'Panavision C', insert: 'Panavision C-series anamorphic' }, { name: 'Hawk V-Lite', insert: 'Hawk V-Lite anamorphic, rich horizontal flares' }, { name: 'Atlas Orion', insert: 'Atlas Orion anamorphic, warm oval bokeh' }] },
      { name: 'DREAM', label: 'Dreamy / Diffused', effect: 'Soft, glowing edges. Memory, romance, or fragile beauty. The world seen through emotion.', insert: 'dreamy soft lens, diffused glow', subOptions: [{ name: 'Black Pro-Mist', insert: 'Black Pro-Mist diffusion, highlight bloom' }, { name: 'Glimmer Glass', insert: 'Glimmer Glass diffusion, glow on highlights' }, { name: 'Net diffusion', insert: 'net diffusion filter, classic Hollywood softness' }] },
    ],
  },
  'Color grade style?': {
    context: 'The grade is your final emotional statement over the entire image. It unifies everything.',
    options: [
      { name: 'NAT', label: 'Natural / True', effect: 'Honest and transparent. The grade steps back. Used in documentary and realist drama.', insert: 'natural color grade, minimal processing', subOptions: [{ name: 'Rec709 natural', insert: 'natural Rec709, standard balanced color' }, { name: 'True film print', insert: 'natural film print, minimal grade' }, { name: 'Vérité natural', insert: 'cinéma vérité natural, documentary color' }] },
      { name: 'DESAT', label: 'Desaturated', effect: 'Washed out, world-weary. Color drained from things — grief, exhaustion, aftermath.', insert: 'desaturated, muted palette', subOptions: [{ name: 'Slight desat', insert: 'slightly desaturated, muted' }, { name: 'Heavy desat', insert: 'heavily desaturated, near monochrome' }, { name: 'Ash tones', insert: 'ash and grey tones, color stripped out' }] },
      { name: 'T&O', label: 'Teal & Orange', effect: "Hollywood's signature. Warm skin tones against cool shadows. Cinematic contrast.", insert: 'teal and orange grade', subOptions: [{ name: 'Classic T&O', insert: 'classic teal and orange, Hollywood standard' }, { name: 'Subtle T&O', insert: 'subtle teal and orange, tasteful' }, { name: 'Aggressive T&O', insert: 'aggressive teal and orange, full cinematic push' }] },
      { name: 'BLEACH', label: 'Bleach Bypass', effect: "High contrast, desaturated, metallic. Gritty war films and intense drama. Saving Private Ryan.", insert: 'bleach bypass, silver retention look', subOptions: [{ name: 'Classic bleach', insert: 'bleach bypass, Saving Private Ryan look' }, { name: 'Half bleach', insert: 'partial bleach bypass, subtle silver retention' }, { name: 'Digital bleach', insert: 'digital bleach bypass emulation' }] },
      { name: 'MONO', label: 'Monochrome / B&W', effect: 'Strips reality to light and shadow. Timeless and formal. Forces composition to the front.', insert: 'monochrome, black and white', subOptions: [{ name: 'High contrast B&W', insert: 'high contrast black and white' }, { name: 'Warm B&W', insert: 'warm-toned monochrome, sepia adjacent' }, { name: 'Silver-rich B&W', insert: 'silver-rich black and white, metallic look' }] },
      { name: 'CCOLOR', label: 'Cross-Processed', effect: 'Unnatural color shifts in shadows and highlights. Aggressive, stylized, often 90s/00s feeling.', insert: 'cross-processed color grade, color shift', subOptions: [{ name: 'Green shadows', insert: 'cross-processed, green crushed shadows' }, { name: 'Yellow highlights', insert: 'cross-processed, toxic yellow highlights' }] },
    ],
  },
  'VFX / comp notes?': {
    context: "Visual effects are a tool, not a goal. The best VFX are invisible — they serve the story.",
    options: [
      { name: 'PRAC', label: 'Practical In-Camera', effect: 'Real elements in the real world. Audiences feel the difference even if they cannot name it.', insert: 'practical in-camera effects', subOptions: [{ name: 'Smoke practical', insert: 'practical smoke and fog in-camera' }, { name: 'Rain rig', insert: 'practical rain rig, in-camera rain' }, { name: 'Pyro', insert: 'practical pyrotechnics, in-camera fire' }] },
      { name: 'CGI', label: 'CGI Composite', effect: 'Digital environments or elements added in post. Requires careful lighting match to feel real.', insert: 'CGI composite, digital background', subOptions: [{ name: 'Digital environment', insert: 'CGI digital environment extension' }, { name: 'Sky replace', insert: 'sky replacement, CG atmospheric sky' }, { name: 'Creature CGI', insert: 'CGI creature or character composite' }] },
      { name: 'FLARE', label: 'Lens Flare / Leaks', effect: 'Organic imperfections that make digital footage feel more like film. Warmth and nostalgia.', insert: 'lens flares, light leaks', subOptions: [{ name: 'Anamorphic flares', insert: 'horizontal anamorphic lens flares' }, { name: 'Light leaks', insert: 'film-style light leaks on edge of frame' }, { name: 'Prism scatter', insert: 'prism lens flare scatter effect' }] },
      { name: 'PART', label: 'Particle FX', effect: 'Dust, smoke, rain, sparks. Adds atmosphere and three-dimensionality to a scene.', insert: 'particle effects, atmospheric depth', subOptions: [{ name: 'Dust motes', insert: 'visible dust particles floating in light' }, { name: 'Smoke layer', insert: 'atmospheric smoke layer, environmental depth' }, { name: 'Rain particles', insert: 'rain particle system, depth and wetness' }] },
    ],
  },
  // ── AUDIO ──
  'Diegetic sounds?': {
    context: "Diegetic sound exists in the world of the scene. Characters can hear it. It makes the world real.",
    options: [
      { name: 'FEET', label: 'Footsteps / Movement', effect: 'Grounds physical presence. We feel the character in the space.', insert: 'footsteps, movement sounds', subOptions: [{ name: 'Hard floors', insert: 'footsteps on hard floor, echo' }, { name: 'Soft ground', insert: 'footsteps on soft ground, muffled' }, { name: 'Wet footsteps', insert: 'wet footsteps, splashing in rain' }] },
      { name: 'ENV', label: 'Environmental Ambience', effect: 'Wind, traffic, insects — the ambient texture that tells us where we are.', insert: 'environmental ambience, location sound', subOptions: [{ name: 'City ambience', insert: 'urban city ambience, traffic and distant voices' }, { name: 'Nature ambience', insert: 'natural environment, birds and wind' }, { name: 'Indoor room tone', insert: 'indoor room tone, low subtle hum' }] },
      { name: 'VOICES', label: 'Crowd / Background', effect: 'Other people exist. Isolation is louder when we can hear the world carrying on without them.', insert: 'background voices, crowd murmur', subOptions: [{ name: 'Distant crowd', insert: 'distant crowd murmur, isolation' }, { name: 'Nearby chatter', insert: 'nearby conversation, audible but unclear' }, { name: 'Laughing crowd', insert: 'crowd laughing, contrast with isolated character' }] },
      { name: 'MECH', label: 'Mechanical / Clock', effect: 'Ticking, machinery, phones — signals time pressure or inhuman systems at work.', insert: 'mechanical sounds, ticking, machinery', subOptions: [{ name: 'Clock ticking', insert: 'loud clock ticking, time pressure' }, { name: 'Machine hum', insert: 'industrial machine hum, constant and oppressive' }, { name: 'Phone ringing', insert: 'phone ringing unanswered' }] },
      { name: 'SIL', label: 'Near Silence', effect: 'The most powerful sound choice. Total silence is deafening in a film context.', insert: 'near silence, minimal diegetic sound', subOptions: [{ name: 'Total silence', insert: 'absolute silence, no ambient whatsoever' }, { name: 'Near silent', insert: 'near-silence with tiny distant sounds' }, { name: 'Ringing silence', insert: 'tinnitus-style ringing silence, post-trauma' }] },
    ],
  },
  'Score / music style?': {
    context: 'Music tells the audience what to feel. Use it with intention — it is the most direct line to emotion.',
    options: [
      { name: 'ORCH', label: 'Orchestral', effect: 'Sweeping and emotional. Signals scale and narrative importance. The language of cinema itself.', insert: 'orchestral score, sweeping strings', subOptions: [{ name: 'String swell', insert: 'orchestral string swell, emotional and rising' }, { name: 'Tension brass', insert: 'orchestral brass tension stabs' }, { name: 'Zimmer style', insert: 'Zimmer-style hybrid orchestral, epic' }] },
      { name: 'SYNTH', label: 'Electronic / Synth', effect: 'Cold, modern, or retro-futuristic. Controls and distances the audience — or creates propulsive energy.', insert: 'electronic score, synthesizer', subOptions: [{ name: 'Cold synth', insert: 'cold electronic synth, clinical and distant' }, { name: 'Retro 80s synth', insert: 'retro 1980s synthesizer score' }, { name: 'Blade Runner', insert: 'Vangelis-style ambient synth, Blade Runner' }] },
      { name: 'DRONE', label: 'Ambient / Drone', effect: "Creates unease without melody. The audience can't name what they're feeling — which makes it more powerful.", insert: 'ambient drone, atonal texture', subOptions: [{ name: 'Low drone', insert: 'deep low ambient drone, subterranean' }, { name: 'Dissonant', insert: 'dissonant atonal drone, pure unease' }, { name: 'Spatial', insert: 'spatial ambient drone, expansive and vast' }] },
      { name: 'ACOUS', label: 'Acoustic / Folk', effect: 'Warm, immediate, human. Makes grief or loss feel personal rather than epic.', insert: 'acoustic, folk-style score', subOptions: [{ name: 'Solo guitar', insert: 'single acoustic guitar, intimate and sparse' }, { name: 'Folk strings', insert: 'folk violin and acoustic strings' }, { name: 'Solo piano', insert: 'solo piano, spare and emotional' }] },
      { name: 'NONE', label: 'No Score / Silence', effect: "The most daring choice. Without music, the audience must generate their own emotional response.", insert: 'no score, silence', subOptions: [{ name: 'Dialogue only', insert: 'no score, dialogue and diegetic only' }, { name: 'Silence + breath', insert: 'silence with only breathing and minimal sound' }, { name: 'Ambient only', insert: 'no musical score, ambient sound only' }] },
    ],
  },
  'Dialogue / VO?': {
    context: "What is heard — and what is left unspoken — shapes meaning as much as any visual.",
    options: [
      { name: 'ONSCR', label: 'On-Screen Dialogue', effect: 'Characters speaking to each other. Relationship and conflict through language.', insert: 'on-screen dialogue, characters speaking', subOptions: [{ name: 'Confrontation', insert: 'on-screen confrontational dialogue, raised stakes' }, { name: 'Whispered', insert: 'on-screen whispered dialogue, intimate' }, { name: 'Argument', insert: 'on-screen argument, voices raised' }] },
      { name: 'VO', label: 'Voice-Over Narration', effect: 'A character speaking across time — memory, perspective, or reflection on what is seen.', insert: 'voice-over narration', subOptions: [{ name: 'Past narrator', insert: 'voice-over from past self, retrospective' }, { name: 'Letter read', insert: 'voice-over reading a letter' }, { name: 'Confession', insert: 'voice-over confessional, intimate truth' }] },
      { name: 'INNER', label: 'Internal Monologue', effect: "We hear what the character thinks, not says. Intimacy and dramatic irony — we know more than others do.", insert: 'internal monologue, unspoken thoughts', subOptions: [{ name: 'Racing thoughts', insert: 'internal monologue, rapid anxious thoughts' }, { name: 'Slow realization', insert: 'internal monologue, slow dawning realization' }, { name: 'Two voices', insert: 'internal conflict, two competing inner voices' }] },
      { name: 'SILENT', label: 'No Dialogue', effect: 'Pure visual storytelling. Trust the image. The audience fills the silence with their own meaning.', insert: 'no dialogue, silent scene', subOptions: [{ name: 'Pure visual', insert: 'no dialogue, pure visual storytelling' }, { name: 'Body language only', insert: 'silent scene, all emotion through body language' }, { name: 'Eye contact only', insert: 'silent scene, meaning carried through eye contact' }] },
    ],
  },
  'Silence / ambient?': {
    context: "The spaces between sounds carry as much weight as the sounds themselves.",
    options: [
      { name: 'DEAD', label: 'Dead Silence', effect: 'No sound at all. Deeply unnerving — the world has stopped. Use for shock or profound stillness.', insert: 'dead silence, no ambient sound', subOptions: [{ name: 'Hard cut to silence', insert: 'hard cut to total silence' }, { name: 'Fade to silence', insert: 'fade into silence from noise' }, { name: 'Shock silence', insert: 'sudden shock cut to dead silence' }] },
      { name: 'ROOM', label: 'Room Tone', effect: 'The gentle hum of a space. Feels real and inhabited without drawing attention to itself.', insert: 'room tone, subtle ambient hum', subOptions: [{ name: 'Small room', insert: 'small room tone, tight and intimate' }, { name: 'Large room', insert: 'large room reverb, cathedral-like' }, { name: 'Dead room', insert: 'acoustically dead room, padded silence' }] },
      { name: 'NAT', label: 'Natural Ambient', effect: 'Wind, birds, water — the sound of a world that does not care about the story.', insert: 'natural ambient, outdoor environment sound', subOptions: [{ name: 'Forest', insert: 'forest ambient, birds and rustling leaves' }, { name: 'Ocean', insert: 'ocean ambient, waves and wind' }, { name: 'Open wind', insert: 'wind ambient, open exposed space' }] },
      { name: 'CONTR', label: 'Contrast / Drop', effect: 'A loud scene cuts to sudden quiet — or quiet scene erupts. The drop or eruption carries the emotional punch.', insert: 'sound contrast, sudden quiet after noise', subOptions: [{ name: 'Loud → silence', insert: 'cut from chaos to dead silence' }, { name: 'Silence → loud', insert: 'cut from silence to overwhelming noise' }, { name: 'Sound suck', insert: 'audio suck effect, world goes quiet mid-action' }] },
    ],
  },
  // ── MOOD ──
  'Emotional tone?': {
    context: 'Every shot has an emotional temperature. Be intentional about what you are asking the audience to feel.',
    options: [
      { name: 'TENSE', label: 'Tense / Threatening', effect: 'The audience feels danger without action. Silence, tight framing, slow movement create this.', insert: 'tense, threatening atmosphere', subOptions: [{ name: 'Paranoid', insert: 'paranoid tension, everything feels suspicious' }, { name: 'Claustrophobic', insert: 'claustrophobic tension, walls closing in' }, { name: 'Held breath', insert: 'held-breath tension, something about to happen' }] },
      { name: 'MELAN', label: 'Melancholic', effect: 'Loss that has already happened. Soft light, still camera, muted palette, silence.', insert: 'melancholic, sorrowful tone', subOptions: [{ name: 'Grief', insert: 'melancholic grief, loss already happened' }, { name: 'Longing', insert: 'melancholic longing, something absent' }, { name: 'Regret', insert: 'melancholic regret, past weighing heavily' }] },
      { name: 'MENAC', label: 'Menacing', effect: 'Something bad is near. Low angles, deep shadow, deliberate unhurried movement.', insert: 'menacing, sinister undercurrent', subOptions: [{ name: 'Predatory', insert: 'predatory menace, hunter watching prey' }, { name: 'Quiet menace', insert: 'quiet menace, threat implied not shown' }, { name: 'Controlled threat', insert: 'controlled deliberate threat, unhurried violence implied' }] },
      { name: 'SEREN', label: 'Serene / Peaceful', effect: 'Peace — but in cinema, peace often precedes its opposite. Use carefully; audiences will wait for the break.', insert: 'serene, peaceful atmosphere', subOptions: [{ name: 'Morning peace', insert: 'serene morning peace, soft light and stillness' }, { name: 'After rain', insert: 'serene after rain, world washed clean' }, { name: 'Meditative', insert: 'meditative serenity, present-moment stillness' }] },
      { name: 'HOPE', label: 'Hopeful', effect: 'Light in darkness. The scene does not resolve — but something could.', insert: 'hopeful, searching tone', subOptions: [{ name: 'Fragile hope', insert: 'fragile small hope, tenuous but real' }, { name: 'Rising hope', insert: 'rising hope, ascending feeling' }, { name: 'Against odds', insert: 'hope persisting against odds, in darkness' }] },
      { name: 'JOY', label: 'Joyful / Warm', effect: 'Warmth in the image and movement. The camera moves with the energy, not against it.', insert: 'joyful, warm energy', subOptions: [{ name: 'Shared joy', insert: 'shared communal joy, celebration' }, { name: 'Private joy', insert: 'private internal joy, quiet smile' }, { name: 'Euphoric', insert: 'intense euphoric joy, slightly unhinged energy' }] },
    ],
  },
  'Tension level?': {
    context: 'Tension is managed across a scene, not just present or absent. Build it — then you must release it.',
    options: [
      { name: 'CALM', label: 'Calm / Baseline', effect: 'Establish this before you take it away. The audience needs a baseline to feel the contrast.', insert: 'calm, peaceful baseline', subOptions: [{ name: 'Dead calm', insert: 'total calm, baseline fully established' }, { name: 'Fragile calm', insert: 'fragile calm, something feels wrong underneath' }, { name: 'Forced calm', insert: 'forced calm, characters suppressing feelings' }] },
      { name: 'UNEASE', label: 'Subtle Unease', effect: 'Something is slightly wrong. The audience senses it before they can name it.', insert: 'subtle unease, something slightly off', subOptions: [{ name: 'Wrong detail', insert: 'unease from one wrong detail in frame' }, { name: 'Off behavior', insert: 'unease from slightly off behavior' }, { name: 'Wrong silence', insert: 'unease from a silence that should have sound' }] },
      { name: 'BUILD', label: 'Building Dread', effect: 'Every beat increases the pressure. The audience cannot look away.', insert: 'building dread, escalating tension', subOptions: [{ name: 'Slow build', insert: 'slow inexorable tension build' }, { name: 'Staccato build', insert: 'staccato tension, escalating beats' }, { name: 'Spiral build', insert: 'spiraling build, accelerating toward peak' }] },
      { name: 'PEAK', label: 'Peak Tension', effect: "The tightest moment. Often the quietest. Don't add music here.", insert: 'peak tension, maximum pressure', subOptions: [{ name: 'Held peak', insert: 'held peak tension, maximum sustained pressure' }, { name: 'Silent peak', insert: 'peak tension delivered in total silence' }, { name: 'Physical peak', insert: 'peak tension before physical confrontation' }] },
      { name: 'RELAX', label: 'Release / Relief', effect: 'The exhale. After sustained tension, the audience physically relaxes. This is its own kind of power.', insert: 'tension release, relief', subOptions: [{ name: 'Exhale', insert: 'tension release, visible exhale of relief' }, { name: 'Laughter release', insert: 'tension released through laughter' }, { name: 'Physical relief', insert: 'physical collapse of tension, body letting go' }] },
    ],
  },
  'Genre feel?': {
    context: "Genre sets audience expectations. You can fulfill them, subvert them, or transcend them — but know what they are.",
    options: [
      { name: 'DRAMA', label: 'Drama', effect: 'Internal conflict externalized. Quiet stakes. Performance carries the film.', insert: 'dramatic, character-driven', subOptions: [{ name: 'Intimate drama', insert: 'intimate character drama, small personal stakes' }, { name: 'Social drama', insert: 'social drama, systemic conflict externalized' }, { name: 'Tragedy', insert: 'tragic register, inevitable decline' }] },
      { name: 'THRILL', label: 'Thriller', effect: 'External danger and information asymmetry. What the audience knows vs. what the character knows.', insert: 'thriller, suspenseful', subOptions: [{ name: 'Neo-noir', insert: 'neo-noir thriller, moral ambiguity and rain' }, { name: 'Conspiracy', insert: 'conspiracy thriller, information is power' }, { name: 'Psychological', insert: 'psychological thriller, truth is unreliable' }] },
      { name: 'HORROR', label: 'Horror', effect: 'The audience fears for the character — and then fears for themselves.', insert: 'horror, dread-driven', subOptions: [{ name: 'Slow burn', insert: 'slow-burn atmospheric horror' }, { name: 'Body horror', insert: 'body horror, physical transformation and dread' }, { name: 'Cosmic horror', insert: 'cosmic horror, scale incomprehensible' }] },
      { name: 'ACTION', label: 'Action', effect: 'Kinetic, visceral, spatial clarity. The audience needs to understand the geography of conflict.', insert: 'action, kinetic energy', subOptions: [{ name: 'Tactical', insert: 'tactical action, spatial clarity and precision' }, { name: 'Kinetic chaos', insert: 'kinetic visceral action, energy and chaos' }, { name: 'Epic scale', insert: 'epic large-scale action, scope and stakes' }] },
      { name: 'ARTHO', label: 'Art House', effect: 'Formal, patient, willing to be ambiguous. The audience is asked to do interpretive work.', insert: 'art house, formal and contemplative', subOptions: [{ name: 'Slow cinema', insert: 'slow cinema, long takes and patience' }, { name: 'Auteur', insert: 'auteur personal vision, singular perspective' }, { name: 'Minimalist', insert: 'minimalist art house, reduction to essence' }] },
      { name: 'DOC', label: 'Documentary Feel', effect: 'Observational, unpolished, present. Handheld, natural light, real spaces.', insert: 'documentary aesthetic, observational', subOptions: [{ name: 'Observational', insert: 'observational documentary, fly-on-wall' }, { name: 'Interview style', insert: 'documentary interview style, direct to camera' }, { name: 'Vérité', insert: 'cinéma vérité, immediate and unpolished' }] },
    ],
  },
  'Reference films?': {
    context: "A film reference anchors the AI to a specific visual language. Be specific — name the director, film, or scene.",
    options: [
      { name: 'KUB', label: 'Kubrick', effect: 'Symmetry, one-point perspective, slow zoom, cold precision. Control and dread.', insert: 'Stanley Kubrick visual style, symmetrical and cold', subOptions: [{ name: 'The Shining', insert: 'Kubrick, The Shining visual language' }, { name: '2001', insert: 'Kubrick 2001, clinical and vast' }, { name: 'Full Metal Jacket', insert: 'Full Metal Jacket, institutional precision' }] },
      { name: 'VILLR', label: 'Villeneuve', effect: 'Epic scale, hushed intimacy, Roger Deakins palette — vast and personal at once.', insert: 'Denis Villeneuve style, Deakins-lit, vast and intimate', subOptions: [{ name: 'Blade Runner 2049', insert: 'Blade Runner 2049, Deakins-lit neon desolation' }, { name: 'Dune', insert: 'Dune 2021, epic intimate desolation' }, { name: 'Arrival', insert: 'Arrival, cold wonder and emotional scale' }] },
      { name: 'WONK', label: 'Wes Anderson', effect: 'Centered framing, pastel palette, flat composition. Melancholy disguised as whimsy.', insert: 'Wes Anderson aesthetic, centered pastel symmetry', subOptions: [{ name: 'Grand Budapest', insert: 'Grand Budapest Hotel, saturated pastel symmetry' }, { name: 'Moonrise Kingdom', insert: 'Moonrise Kingdom, warm nostalgic palette' }, { name: 'Rushmore', insert: 'Rushmore, flat deadpan aesthetic' }] },
      { name: 'FINCH', label: 'Fincher', effect: 'Digital precision, desaturated cool tones, methodical camera movement. Controlled menace.', insert: 'David Fincher style, cold and precise', subOptions: [{ name: 'Se7en', insert: 'Se7en, dark desaturated menace' }, { name: 'Zodiac', insert: 'Zodiac, procedural cold detail' }, { name: 'Fight Club', insert: 'Fight Club, desaturated aggressive style' }] },
      { name: 'WONG', label: 'Wong Kar-wai', effect: 'Step-printing, neon blur, saturated colors, emotional fragmentation. Memory and longing.', insert: 'Wong Kar-wai aesthetic, saturated neon, motion blur', subOptions: [{ name: 'In the Mood for Love', insert: 'In the Mood for Love, saturated longing and blur' }, { name: 'Chungking Express', insert: 'Chungking Express, neon speed and isolation' }, { name: 'Happy Together', insert: 'Happy Together, oversaturated melancholy' }] },
    ],
  },
  // ── COLOR ──
  'Palette / scheme?': {
    context: 'Color is emotion before thought. An audience responds to palette before they understand what they are seeing.',
    options: [
      { name: 'MONO', label: 'Monochromatic', effect: 'One hue in different saturations. Harmonious and focused — slightly surreal and stylized.', insert: 'monochromatic palette, single hue family', subOptions: [{ name: 'Blue mono', insert: 'monochromatic blue palette' }, { name: 'Green mono', insert: 'monochromatic green palette' }, { name: 'Amber mono', insert: 'monochromatic amber palette' }] },
      { name: 'COMP', label: 'Complementary', effect: 'Opposite colors. High visual tension and energy. Teal and Orange is the Hollywood version of this.', insert: 'complementary colors, high contrast palette', subOptions: [{ name: 'Teal & orange', insert: 'teal and orange complementary, cinematic' }, { name: 'Red & green', insert: 'red and green complementary, tension' }, { name: 'Purple & yellow', insert: 'purple and yellow complementary' }] },
      { name: 'ANAL', label: 'Analogous', effect: 'Neighboring colors. Harmonious and organic — feels natural and cohesive.', insert: 'analogous palette, neighboring hues', subOptions: [{ name: 'Warm analogous', insert: 'warm analogous, reds oranges yellows' }, { name: 'Cool analogous', insert: 'cool analogous, blues greens teals' }, { name: 'Earth tones', insert: 'earth tone analogous, browns tans greens' }] },
      { name: 'NEUT', label: 'Neutral + Accent', effect: 'A grey or beige world with one deliberate color. That color carries all the emotional weight.', insert: 'neutral palette with single color accent', subOptions: [{ name: 'Red accent', insert: 'neutral grey world, single red accent' }, { name: 'Blue accent', insert: 'neutral warm world, single blue accent' }, { name: 'Yellow accent', insert: 'neutral dark world, single yellow accent' }] },
      { name: 'DESAT', label: 'Desaturated', effect: 'Color drained from the world. Emotional distance, exhaustion, or the feeling of aftermath.', insert: 'desaturated, near-monochrome palette', subOptions: [{ name: 'Slight desat', insert: 'slightly desaturated palette, muted' }, { name: 'Near mono', insert: 'nearly monochrome, just trace of color' }, { name: 'Ash tones', insert: 'ash and grey tones, color stripped out' }] },
    ],
  },
  'Dominant hues?': {
    context: "Name 1-3 colors that should dominate the frame. This anchors the grade before it starts.",
    options: [
      { name: 'AMBER', label: 'Amber / Gold', effect: 'Warmth, nostalgia, late light, intimacy. The most emotionally welcoming color.', insert: 'amber and gold dominant tones', subOptions: [{ name: 'Deep amber', insert: 'deep amber gold tones, rich and warm' }, { name: 'Pale gold', insert: 'pale gold morning light tones' }, { name: 'Burnt orange', insert: 'burnt orange dominant, sunset warmth' }] },
      { name: 'TEAL', label: 'Teal / Cyan', effect: 'Cool, clinical, modern, or ominous. Pairs with orange to create cinematic contrast.', insert: 'teal and cyan dominant', subOptions: [{ name: 'Deep teal', insert: 'deep teal dominant, cinematic shadows' }, { name: 'Aqua', insert: 'aqua teal, lighter and modern' }, { name: 'Shadow teal', insert: 'teal specifically in shadows and midtones' }] },
      { name: 'CREAM', label: 'Cream / Ivory', effect: 'Soft, nostalgic, period-appropriate. Strips the modern harshness from the image.', insert: 'cream and ivory palette', subOptions: [{ name: 'Warm cream', insert: 'warm cream and ivory tones' }, { name: 'Linen', insert: 'linen off-white tones, period feel' }, { name: 'Bleached', insert: 'bleached cream, faded memory quality' }] },
      { name: 'SLATE', label: 'Slate / Steel Blue', effect: 'Cold, distant, melancholic. The color of rain, concrete, and things left behind.', insert: 'slate and steel blue tones', subOptions: [{ name: 'Steel blue', insert: 'steel blue dominant, cold and modern' }, { name: 'Dark slate', insert: 'dark slate tones, heavy and cold' }, { name: 'Concrete grey', insert: 'concrete grey-blue, urban cold' }] },
      { name: 'GREEN', label: 'Sickly Green', effect: 'Unease, surveillance, or the feeling of being under fluorescent light. Something is wrong here.', insert: 'sickly green undertones', subOptions: [{ name: 'Sick fluorescent', insert: 'sickly green, fluorescent contamination' }, { name: 'Deep forest', insert: 'deep forest green dominant' }, { name: 'Olive', insert: 'olive green tones, military or documentary' }] },
      { name: 'NEON', label: 'Neon / Synthwave', effect: 'Highly saturated, unnatural glow. Usually magentas, cyans, deep purples.', insert: 'vibrant neon colors, magenta and cyan', subOptions: [{ name: 'Bisexual lighting', insert: 'magenta, blue and purple neon lighting mix' }, { name: 'Pure Red', insert: 'pure saturated red lighting dominant' }] },
    ],
  },
  'Contrast level?': {
    context: 'Contrast shapes how the audience reads depth and emotion in a frame.',
    options: [
      { name: 'LOW', label: 'Low Contrast / Milky', effect: 'Flat, airy, modern. Feels like a lifted shadow, a recent Instagram aesthetic. Soft and non-threatening.', insert: 'low contrast, lifted blacks, milky tones', subOptions: [{ name: 'Matte low', insert: 'matte low contrast, lifted blacks, airy' }, { name: 'Faded look', insert: 'faded low contrast, washed look' }, { name: 'Modern milky', insert: 'modern milky low contrast, Instagram aesthetic' }] },
      { name: 'MED', label: 'Medium / Natural', effect: 'Honest and balanced. The audience reads depth naturally without drama.', insert: 'medium natural contrast', subOptions: [{ name: 'Classic medium', insert: 'classic medium contrast, balanced' }, { name: 'Film print', insert: 'medium contrast film print look' }, { name: 'Honest medium', insert: 'honest natural medium, no stylization' }] },
      { name: 'HIGH', label: 'High Contrast', effect: 'Bold graphic shapes. Shadows are deep, highlights are hot. Dramatic and theatrical.', insert: 'high contrast, deep blacks and bright highlights', subOptions: [{ name: 'Graphic high', insert: 'graphic high contrast, bold shape-defining' }, { name: 'Theatrical', insert: 'theatrical high contrast, stage-like drama' }, { name: 'Extreme high', insert: 'extreme high contrast, near black and white' }] },
      { name: 'CRUSH', label: 'Crushed Blacks', effect: 'Blacks clipped to pure black. Everything in shadow disappears. Noir and menace.', insert: 'crushed blacks, clipped shadows', subOptions: [{ name: 'Noir crush', insert: 'crushed blacks, classic noir' }, { name: 'Half frame crush', insert: 'half frame in crushed shadow' }, { name: 'Void blacks', insert: 'void blacks, perfect shadow crush, impenetrable dark' }] },
    ],
  },
  'Grade reference?': {
    context: "A DP or film reference locks in the grade direction instantly. Be as specific as possible.",
    options: [
      { name: 'DEAKINS', label: 'Roger Deakins', effect: 'Clean, precise, often cool with warm practicals. No Country, Blade Runner 2049, 1917.', insert: 'Roger Deakins palette, clean and precise', subOptions: [{ name: 'No Country', insert: 'No Country for Old Men, Deakins arid sparse' }, { name: 'Blade Runner 2049', insert: 'Blade Runner 2049, Deakins neon and desolation' }, { name: '1917', insert: '1917, Deakins desaturated grey-green trench' }] },
      { name: 'LUBEZKI', label: 'Emmanuel Lubezki', effect: 'Natural light pushed to its limits. The Revenant, Children of Men — present and alive.', insert: 'Emmanuel Lubezki natural light aesthetic', subOptions: [{ name: 'The Revenant', insert: 'The Revenant, Lubezki natural grey-cold light' }, { name: 'Children of Men', insert: 'Children of Men, desaturated urgent reality' }, { name: 'Tree of Life', insert: 'Tree of Life, Lubezki warm naturalist golden' }] },
      { name: 'STORARO', label: 'Vittorio Storaro', effect: 'Warm reds and ambers, deliberate color symbolism. Apocalypse Now, The Last Emperor.', insert: 'Vittorio Storaro warm color symbolism', subOptions: [{ name: 'Apocalypse Now', insert: 'Apocalypse Now, Storaro warm fever tones' }, { name: 'The Conformist', insert: 'The Conformist, Storaro amber and shadow' }, { name: 'Last Tango', insert: 'Last Tango in Paris, Storaro warm ochre isolation' }] },
      { name: 'HOYTE', label: 'Hoyte van Hoytema', effect: "Film grain, IMAX scale, Nolan's worlds. Interstellar, Dunkirk — tactile and vast.", insert: 'Hoyte van Hoytema film aesthetic, Nolan-esque', subOptions: [{ name: 'Interstellar', insert: 'Interstellar, van Hoytema IMAX prairie and space' }, { name: 'Dunkirk', insert: 'Dunkirk, van Hoytema desaturated grey-blue' }, { name: 'Her', insert: 'Her, warm rose-pastel futurism' }] },
    ],
  },
  // ── LENS ──
  'Focal length?': {
    context: "Focal length determines how the space between objects feels — expansion vs. compression.",
    options: [
      { name: '14-24', label: 'Ultra-Wide 14-24mm', effect: 'Expands space, exaggerates depth. Can distort. Creates anxiety, scale, or immersion in environment.', insert: 'ultra-wide lens, 14-24mm', subOptions: [{ name: '14mm', insert: '14mm ultra-wide, maximum space expansion' }, { name: '18mm', insert: '18mm wide, strong environmental immersion' }, { name: '24mm', insert: '24mm, wide but controlled distortion' }] },
      { name: '35MM', label: 'Wide 35mm', effect: 'Close to human peripheral vision. Documentary and observational. Feels present and immediate.', insert: '35mm lens', subOptions: [{ name: '28mm', insert: '28mm, very wide observational' }, { name: '35mm classic', insert: '35mm classic, New Hollywood standard' }, { name: '35mm prime', insert: '35mm prime lens, documentary intimacy' }] },
      { name: '50MM', label: 'Normal 50mm', effect: 'Closest to natural human vision. Honest, direct, unmanipulative. The purist choice.', insert: '50mm lens, natural perspective', subOptions: [{ name: '45mm', insert: '45mm, near-normal perspective' }, { name: '50mm standard', insert: '50mm standard, truest human vision' }, { name: '55mm', insert: '55mm, very slight compression begins' }] },
      { name: '85MM', label: 'Portrait 85mm', effect: 'Slight compression. Flattering and isolating. The classic portrait and close-up lens.', insert: '85mm portrait lens', subOptions: [{ name: '85mm portrait', insert: '85mm portrait lens, classic framing' }, { name: '100mm', insert: '100mm, strong portrait compression' }, { name: '105mm macro', insert: '105mm macro portrait, intimate compression' }] },
      { name: 'TELE', label: 'Telephoto 135-200mm', effect: 'Compresses space — layers flatten together. Surveillance feel. Subject is watched, not engaged.', insert: 'telephoto lens, 135-200mm', subOptions: [{ name: '135mm', insert: '135mm telephoto, beginning surveillance feel' }, { name: '200mm', insert: '200mm telephoto, strong compression' }, { name: '400mm+', insert: '400mm+ super telephoto, extreme compression' }] },
      { name: 'PROBE', label: 'Probe Lens', effect: 'Insect-eye perspective. Immense depth of field very close to subjects.', insert: 'Laowa probe lens wide macro perspective', subOptions: [{ name: 'Creeping macro', insert: 'creeping wide-angle macro probe shot' }, { name: 'Pass through', insert: 'probe lens passing through small opening' }] },
    ],
  },
  'Aperture / DOF?': {
    context: "Depth of field determines what the audience is allowed to see clearly — and what stays hidden.",
    options: [
      { name: 'WIDE', label: 'f/1.2–f/2 Shallow', effect: 'Subject in sharp focus, everything else dissolves. Total isolation. The background disappears.', insert: 'very shallow DOF, f/1.4-2, creamy bokeh', subOptions: [{ name: 'f/1.2 wide open', insert: 'f/1.2 wide open, razor-thin DOF' }, { name: 'f/1.8', insert: 'f/1.8, very shallow bokeh portrait' }, { name: 'f/2 shallow', insert: 'f/2, creamy subject isolation' }] },
      { name: 'MED', label: 'f/2.8–f/5.6 Moderate', effect: 'Subject clear, background soft but readable. Subject and world coexist.', insert: 'moderate DOF, f/2.8-5.6', subOptions: [{ name: 'f/2.8', insert: 'f/2.8, soft background with context' }, { name: 'f/4', insert: 'f/4, moderate DOF near and far readable' }, { name: 'f/5.6', insert: 'f/5.6, moderate depth, landscape feel' }] },
      { name: 'DEEP', label: 'f/8+ Deep Focus', effect: 'Everything sharp front to back. Orson Welles used this — the audience can read the entire frame.', insert: 'deep focus, f/8+, everything sharp throughout', subOptions: [{ name: 'f/8 deep', insert: 'f/8 deep focus, near and far both sharp' }, { name: 'f/11', insert: 'f/11, extensive focus plane' }, { name: 'f/16 Citizen Kane', insert: 'f/16+ deep focus, Citizen Kane style' }] },
    ],
  },
  'Distortion?': {
    context: "Lens distortion shapes how the audience perceives space — expanded, compressed, or surreal.",
    options: [
      { name: 'NONE', label: 'None / Rectilinear', effect: 'Straight lines stay straight. The world appears as it is.', insert: 'no distortion, rectilinear perspective', subOptions: [{ name: 'Perfect rect.', insert: 'perfect rectilinear, zero distortion' }, { name: 'Corrected wide', insert: 'corrected wide lens, natural straight lines' }, { name: 'Subtle natural', insert: 'slight natural perspective, as seen by eye' }] },
      { name: 'BARREL', label: 'Barrel / Fisheye', effect: 'Lines bow outward. Immersive and slightly surreal — the whole environment visible at once.', insert: 'barrel distortion, wide fisheye', subOptions: [{ name: 'Subtle barrel', insert: 'subtle barrel distortion, slight bow' }, { name: 'Strong fisheye', insert: 'strong fisheye, significant barrel bow' }, { name: 'Full 180°', insert: '180° fisheye, circular full distortion' }] },
      { name: 'ANAM', label: 'Anamorphic Squeeze', effect: 'The cinematic widescreen look. Oval bokeh, horizontal flares, slight horizontal stretch.', insert: 'anamorphic lens, 2x squeeze, oval bokeh', subOptions: [{ name: '1.5x squeeze', insert: '1.5x anamorphic squeeze' }, { name: '2x squeeze', insert: '2x anamorphic, classic cinematic squeeze' }, { name: 'Spherical + flares', insert: 'spherical lens with anamorphic flares added' }] },
      { name: 'TILT', label: 'Tilt-Shift', effect: 'Selective focus plane — makes reality look like a miniature. Unusual and dreamlike.', insert: 'tilt-shift lens, selective focus plane', subOptions: [{ name: 'Vertical tilt', insert: 'vertical tilt-shift, miniature effect' }, { name: 'Forward tilt', insert: 'tilt-shift forward plane, receding focus' }, { name: 'Band focus', insert: 'extreme tilt-shift, single horizontal band of focus' }] },
    ],
  },
  'Filter / diffusion?': {
    context: "Filters are the last physical layer before the sensor — they shape light before it becomes image.",
    options: [
      { name: 'NONE', label: 'No Filter', effect: 'Raw, unmodified. Clean and honest. The image without an opinion.', insert: 'no filter, clean glass', subOptions: [{ name: 'Clear glass', insert: 'no filter, clean clear glass' }, { name: 'UV only', insert: 'UV protective filter only' }, { name: 'Raw digital', insert: 'no filter, raw digital capture' }] },
      { name: 'MIST', label: 'Black Mist / Pro-Mist', effect: 'Bloom on highlights, halation around lights, slight glow. Makes digital feel like film.', insert: 'black mist diffusion, highlight bloom', subOptions: [{ name: 'BPM 1/4', insert: 'Black Pro-Mist 1/4, very subtle' }, { name: 'BPM 1/2', insert: 'Black Pro-Mist 1/2, moderate glow' }, { name: 'BPM full', insert: 'Black Pro-Mist full strength, heavy diffusion' }] },
      { name: 'ND', label: 'Neutral Density', effect: 'Reduces light without affecting color. Enables wide aperture in bright conditions — shallow DOF outdoors.', insert: 'ND filter, wide aperture in bright light', subOptions: [{ name: 'ND3', insert: 'ND3, 1-stop light reduction' }, { name: 'ND6', insert: 'ND6, 2-stop, enabling wide aperture in daylight' }, { name: 'Variable ND', insert: 'variable ND, flexible outdoor control' }] },
      { name: 'POLAR', label: 'Polarizer', effect: 'Cuts reflections, deepens sky contrast, saturates colors. Outdoor cinematography staple.', insert: 'polarizing filter, cut reflections', subOptions: [{ name: 'Circular polar', insert: 'circular polarizer, deep sky and reflections cut' }, { name: 'Warm polar', insert: 'polarizer with warm 81A correction' }, { name: 'Sky deepener', insert: 'polarizer maximizing sky contrast' }] },
    ],
  },
};

// ── Edit Prompt Director Guides ──────────────────────────────────────────────

export const EDIT_DIRECTOR_GUIDES: Record<string, DirectorGuide> = {
  // Subject
  'Age, build & ethnicity?': {
    context: 'Physical specificity anchors the AI to a real person, not a generic figure.',
    options: [
      { name: 'YOUNG', label: 'Late teens / 20s', effect: 'Youth, vulnerability, potential. Skin texture smooth, energy high.', insert: 'late 20s, youthful, smooth skin', subOptions: [{ name: 'Teen', insert: 'late teens, 17-19, youthful energy' }, { name: 'Early 20s', insert: 'early 20s, fresh and energetic' }, { name: 'Late 20s', insert: 'late 20s, youthful but experienced' }] },
      { name: 'MID', label: '30s / 40s', effect: 'Experience and authority. Lines beginning to form. Peak presence.', insert: 'mid 30s to 40s, experienced look', subOptions: [{ name: 'Early 30s', insert: 'early 30s, prime and confident' }, { name: 'Mid 30s', insert: 'mid 30s, peak authority and energy' }, { name: '40s', insert: 'early 40s, established and commanding' }] },
      { name: 'OLDER', label: '50s / 60s+', effect: 'History visible in the face. Weight and gravity. Earned character.', insert: 'late 50s, weathered, character lines', subOptions: [{ name: '50s', insert: 'early 50s, dignified and authoritative' }, { name: '60s', insert: 'early 60s, weathered character' }, { name: '70s+', insert: 'late 60s-70s, deep character lines, gravitas' }] },
      { name: 'ATHL', label: 'Athletic Build', effect: 'Physical capability, discipline. Clothes sit differently — posture is confident.', insert: 'athletic build, defined physique', subOptions: [{ name: 'Runner lean', insert: 'lean athletic, runner physique' }, { name: 'Strong build', insert: 'strong athletic build, defined muscle' }, { name: 'Dancer lean', insert: 'dancer-lean, graceful and controlled' }] },
      { name: 'SLIM', label: 'Slim / Lean', effect: 'Grace and lightness. Can read as fragile or effortless depending on context.', insert: 'slim, lean build', subOptions: [{ name: 'Willowy', insert: 'willowy and tall, elegant' }, { name: 'Slight frame', insert: 'slight frame, delicate' }, { name: 'Wiry', insert: 'wiry and lean, coiled energy' }] },
      { name: 'HEAVY', label: 'Heavy / Full', effect: 'Presence, grounding, weight.', insert: 'heavy, full build, strong presence', subOptions: [{ name: 'Stocky', insert: 'stocky solid build' }, { name: 'Soft', insert: 'soft full build, approachable' }] },
    ],
  },
  'Face: eyes, jawline, expression?': {
    context: 'The face is the primary emotional surface. Describe it precisely.',
    options: [
      { name: 'SHARP', label: 'Sharp Jawline', effect: 'Defined, angular, authoritative. Reads as determined or intense.', insert: 'sharp defined jawline, angular features', subOptions: [{ name: 'Square jaw', insert: 'strong square jawline, angular' }, { name: 'Sharp cheekbones', insert: 'sharp high cheekbones, defined' }, { name: 'Chiseled', insert: 'chiseled angular features, sculpture-like' }] },
      { name: 'SOFT', label: 'Soft Features', effect: 'Approachable, warm, open. Easier to empathize with.', insert: 'soft features, rounded jawline', subOptions: [{ name: 'Round face', insert: 'round soft face, approachable' }, { name: 'Full cheeks', insert: 'full cheeks, warm and friendly' }, { name: 'Gentle features', insert: 'gentle features, open and kind' }] },
      { name: 'INTNS', label: 'Intense Eyes', effect: 'Deep set or striking — the eyes carry the shot. Everything else supports them.', insert: 'intense, deep-set eyes', subOptions: [{ name: 'Deep-set', insert: 'deep-set eyes, shadow beneath brow' }, { name: 'Heavy brow', insert: 'heavy brow ridge, commanding gaze' }, { name: 'Piercing gaze', insert: 'piercing direct gaze, eyes sharp and focused' }] },
      { name: 'NEUT', label: 'Neutral Expression', effect: 'A blank canvas the audience interprets through context.', insert: 'neutral expression, resting face', subOptions: [{ name: 'Composed', insert: 'composed neutral expression, controlled' }, { name: 'Blank', insert: 'blank expression, completely unreadable' }, { name: 'Pensive', insert: 'pensive expression, thoughtful neutral' }] },
      { name: 'WARN', label: 'Warm / Smiling', effect: 'Inviting and open. Lowers the audience\'s guard.', insert: 'warm expression, slight smile', subOptions: [{ name: 'Slight smile', insert: 'slight warm smile, friendly' }, { name: 'Full smile', insert: 'full warm smile, crinkled eyes' }, { name: 'Laughing', insert: 'laughing warm expression, genuinely joyful' }] },
    ],
  },
  'Hair: color, style, length?': {
    context: 'Hair style signals era, personality, and attention (or lack of it) to self-presentation.',
    options: [
      { name: 'MESSY', label: 'Disheveled / Messy', effect: 'Authentic, lived-in, not performing for the camera.', insert: 'disheveled hair, naturally messy', subOptions: [{ name: 'Bedhead', insert: 'bedhead hair, just woken up' }, { name: 'Wind-blown', insert: 'wind-blown messy hair' }, { name: 'Carelessly tousled', insert: 'carelessly tousled, effortless disheveled' }] },
      { name: 'NEAT', label: 'Neat / Styled', effect: 'Controlled, deliberate, presenting a version of themselves.', insert: 'neatly styled hair, groomed', subOptions: [{ name: 'Slicked back', insert: 'hair slicked back, controlled and deliberate' }, { name: 'Side parted', insert: 'neat side part, classic styled' }, { name: 'Precisely groomed', insert: 'precisely groomed, every hair in place' }] },
      { name: 'SHORT', label: 'Short / Close-Cropped', effect: 'Clean, unadorned, functional. Often signals military, institutional, or minimalist personality.', insert: 'short close-cropped hair', subOptions: [{ name: 'Buzzcut', insert: 'buzzcut, severe and minimalist' }, { name: 'Cropped', insert: 'short cropped hair, clean and functional' }, { name: 'Faded sides', insert: 'faded sides with short top' }] },
      { name: 'LONG', label: 'Long / Flowing', effect: 'Romantic, free, or untamed depending on state. Long hair in motion is cinematic.', insert: 'long flowing hair', subOptions: [{ name: 'Loose waves', insert: 'long loose waves, flowing' }, { name: 'Straight long', insert: 'long straight hair, sleek and dramatic' }, { name: 'Wild long', insert: 'long wild untamed hair, free' }] },
    ],
  },
  'Clothing: fabric, fit, details?': {
    context: "Clothing tells the audience who this person is before they speak.",
    options: [
      { name: 'WORN', label: 'Worn / Distressed', effect: 'Life has happened to this person. History and authenticity in every crease.', insert: 'worn, distressed clothing, lived-in', subOptions: [{ name: 'Frayed', insert: 'frayed edges, worn through' }, { name: 'Stained', insert: 'stained and marked fabric' }, { name: 'Patched', insert: 'patched and repaired, long use' }] },
      { name: 'SHARP', label: 'Sharp / Tailored', effect: 'Control and ambition — or armor. The person who dresses perfectly may be hiding something.', insert: 'sharp tailored suit, pressed and fitted', subOptions: [{ name: 'Dark suit', insert: 'sharp dark suit, immaculately pressed' }, { name: 'White collar', insert: 'crisp white collar, sharp contrast' }, { name: 'Tailored coat', insert: 'well-tailored overcoat, commanding' }] },
      { name: 'CASUAL', label: 'Casual / Everyday', effect: 'Off-guard and real. The person beneath the performance.', insert: 'casual everyday clothing, relaxed fit', subOptions: [{ name: 'T-shirt & jeans', insert: 'simple t-shirt and jeans, everyday' }, { name: 'Hoodie', insert: 'hoodie, casual comfortable' }, { name: 'Soft fabrics', insert: 'soft casual layers, comfortable fabrics' }] },
      { name: 'LAYERS', label: 'Layered / Textured', effect: 'Visual complexity that rewards close attention. Depth and individuality.', insert: 'layered clothing, textured fabrics', subOptions: [{ name: 'Knit layers', insert: 'knit sweater over shirt, textured layers' }, { name: 'Jacket over', insert: 'jacket over layers, visual depth' }, { name: 'Mixed fabrics', insert: 'mixed fabric textures, complex and rich' }] },
    ],
  },
  // Action
  'What is the subject doing?': {
    context: "Action reveals character. How someone does something tells us who they are.",
    options: [
      { name: 'STILL', label: 'Completely Still', effect: 'Concentrated, waiting, contained. Stillness is active — something is being held.', insert: 'completely still, no movement', subOptions: [{ name: 'Frozen', insert: 'frozen completely still, suspended moment' }, { name: 'Concentrated', insert: 'still with concentrated focus' }, { name: 'Waiting', insert: 'completely still, waiting for something' }] },
      { name: 'MOVE', label: 'Walking / Moving', effect: 'Purposeful or drifting — the quality of movement reveals intent.', insert: 'in motion, walking or moving', subOptions: [{ name: 'Toward camera', insert: 'walking toward camera, purposeful' }, { name: 'Away', insert: 'walking away, departing' }, { name: 'Drifting', insert: 'drifting aimlessly, no direction' }] },
      { name: 'INTER', label: 'Interacting with Object', effect: 'The prop becomes part of the emotional story. What they touch and how they touch it.', insert: 'interacting with an object, hands occupied', subOptions: [{ name: 'Handling carefully', insert: 'handling object carefully, delicate' }, { name: 'Gripping tightly', insert: 'gripping object tightly, tension' }, { name: 'Setting down', insert: 'deliberately setting object down' }] },
      { name: 'LOOK', label: 'Looking / Observing', effect: 'The act of seeing is an act of desire or fear. What they look at and how they look at it.', insert: 'looking, observing something out of frame', subOptions: [{ name: 'Watching intently', insert: 'watching intently, focused gaze off-frame' }, { name: 'Scanning', insert: 'scanning environment, searching' }, { name: 'Caught looking', insert: 'caught in the act of looking' }] },
    ],
  },
  'Body posture & weight?': {
    context: "The body holds the emotion the face tries to control.",
    options: [
      { name: 'OPEN', label: 'Open / Relaxed', effect: 'At ease, receptive, present. The body is not defending itself.', insert: 'open relaxed posture, weight settled', subOptions: [{ name: 'Arms open', insert: 'open posture, arms relaxed and open' }, { name: 'Settled weight', insert: 'weight settled, fully at ease' }, { name: 'Reclined', insert: 'reclined back, completely relaxed' }] },
      { name: 'TENSE', label: 'Tense / Coiled', effect: 'Ready, anxious, or angry. The body is prepared for something.', insert: 'tense, coiled posture, weight forward', subOptions: [{ name: 'Shoulders up', insert: 'shoulders raised, tension held' }, { name: 'Weight forward', insert: 'weight shifted forward, ready' }, { name: 'Fists tight', insert: 'fists clenched, body coiled with tension' }] },
      { name: 'HUNCH', label: 'Hunched / Closed', effect: 'Protecting something — grief, shame, cold. Withdrawal made visible.', insert: 'hunched, closed off, weight inward', subOptions: [{ name: 'Shoulders down', insert: 'shoulders dropped, hunched inward' }, { name: 'Arms crossed', insert: 'arms crossed, defensive and closed' }, { name: 'Head down', insert: 'head down, folded inward' }] },
      { name: 'LEAN', label: 'Leaning / Off-Balance', effect: 'Caught between two states. Transition and uncertainty.', insert: 'leaning, slightly off-balance', subOptions: [{ name: 'Lean forward', insert: 'leaning forward, drawn toward something' }, { name: 'Lean back', insert: 'leaning back, pulling away' }, { name: 'Tip of balance', insert: 'at the tipping point of balance, unstable' }] },
      { name: 'COLLAPSE', label: 'Collapsed / Prone', effect: 'Complete release of tension. Defeat or rest.', insert: 'collapsed or prone, lying down', subOptions: [{ name: 'Sprawled', insert: 'sprawled out lying down' }, { name: 'Fetal', insert: 'curled defensively in fetal position' }] },
    ],
  },
  'Facial expression & gaze?': {
    context: "The gaze direction tells the audience what the character wants or fears.",
    options: [
      { name: 'CAM', label: 'Direct to Camera', effect: 'Confrontational and intimate. The subject sees the audience. Uncomfortable and powerful.', insert: 'looking directly into camera', subOptions: [{ name: 'Hard stare', insert: 'hard direct stare into lens, confrontational' }, { name: 'Soft direct', insert: 'soft direct gaze, intimate with camera' }, { name: 'Questioning', insert: 'direct questioning gaze into camera' }] },
      { name: 'AWAY', label: 'Looking Away', effect: 'Longing, avoidance, or contemplation. What they look toward tells the story.', insert: 'gaze averted, looking away', subOptions: [{ name: 'Looking left', insert: 'gaze left, looking away into past' }, { name: 'Looking right', insert: 'gaze right, looking toward future' }, { name: 'Looking up', insert: 'gaze upward, longing or hope' }] },
      { name: 'DOWN', label: 'Looking Down', effect: 'Shame, sorrow, or thought. Inward focus.', insert: 'looking down, downcast gaze', subOptions: [{ name: 'Eyes closed', insert: 'eyes closed, downward, overwhelmed' }, { name: 'Downcast', insert: 'downcast gaze, shame or sorrow' }, { name: 'Contemplating', insert: 'eyes down, deep in thought' }] },
      { name: 'DISTANT', label: 'Distant / Unfocused', effect: 'Somewhere else. Memory, trauma, or dissociation.', insert: 'distant unfocused gaze, thousand-yard stare', subOptions: [{ name: 'Thousand yard', insert: 'thousand-yard stare, seeing nothing near' }, { name: 'Dissociated', insert: 'dissociated gaze, not present' }, { name: 'Memory look', insert: 'gaze focused on something only they see' }] },
    ],
  },
  'Props being held or used?': {
    context: "A prop in a character's hands becomes an extension of their emotional state.",
    options: [
      { name: 'PHONE', label: 'Phone / Screen', effect: 'Modern isolation or connection. The phone as portal to another world.', insert: 'holding phone, screen light on face', subOptions: [{ name: 'Phone to face', insert: 'phone pressed to ear, listening' }, { name: 'Scrolling', insert: 'scrolling phone, absorbed in screen' }, { name: 'Phone face-down', insert: 'phone placed face-down, refusing it' }] },
      { name: 'DRINK', label: 'Drink / Cup', effect: 'Comfort, ritual, or social lubricant. Something to hold when nothing else feels steady.', insert: 'holding a drink, cup or glass', subOptions: [{ name: 'Coffee cup', insert: 'holding coffee cup with both hands, warmth' }, { name: 'Wine glass', insert: 'holding wine glass, elevated or lonely' }, { name: 'Just holding', insert: 'holding drink but not drinking, comfort object' }] },
      { name: 'PAPER', label: 'Document / Letter', effect: 'Information being received or delivered. Stakes are on the page.', insert: 'holding paper, letter or document', subOptions: [{ name: 'Reading carefully', insert: 'reading document carefully, absorbing' }, { name: 'Crumpling', insert: 'crumpling paper, emotional response' }, { name: 'Holding tightly', insert: 'holding paper tightly, precious or threatening' }] },
      { name: 'EMPTY', label: 'Empty Hands', effect: 'Vulnerability or readiness. Nothing to hide behind.', insert: 'empty hands, nothing held', subOptions: [{ name: 'Hands open', insert: 'empty hands held open, vulnerable' }, { name: 'Hands clasped', insert: 'hands clasped together, contained emotion' }, { name: 'Hands at sides', insert: 'hands hanging at sides, exposed' }] },
    ],
  },
  // Environment
  'Location: indoor or outdoor?': {
    context: "Interior or exterior is an immediate emotional context — contained or exposed.",
    options: [
      { name: 'INT', label: 'Interior — Home', effect: 'Domestic, intimate, private. The character in their natural habitat.', insert: 'interior, domestic home setting', subOptions: [{ name: 'Bedroom', insert: 'interior bedroom, private and intimate' }, { name: 'Living room', insert: 'interior living room, domestic warmth' }, { name: 'Kitchen', insert: 'interior kitchen, functional domestic' }] },
      { name: 'CAFE', label: 'Interior — Café / Bar', effect: 'Social, transitional. Between-worlds energy — neither home nor work.', insert: 'interior, café or bar setting', subOptions: [{ name: 'Café', insert: 'interior café, warm and transitional' }, { name: 'Bar', insert: 'interior bar, social or lonely' }, { name: 'Restaurant', insert: 'interior restaurant, formal or intimate' }] },
      { name: 'OFFICE', label: 'Interior — Office', effect: 'Institutional, hierarchical. The person within a system.', insert: 'interior, office or professional space', subOptions: [{ name: 'Corporate office', insert: 'corporate office, hierarchical system' }, { name: 'Home office', insert: 'home office, work-life blur' }, { name: 'Industrial workspace', insert: 'industrial workspace, functional and cold' }] },
      { name: 'STREET', label: 'Exterior — Street', effect: 'Exposed, anonymous, moving through the world. Urban texture and indifference.', insert: 'exterior, urban street', subOptions: [{ name: 'Busy street', insert: 'busy urban street, crowd and movement' }, { name: 'Empty street', insert: 'empty street, exposed and alone' }, { name: 'Alley', insert: 'exterior alley, confined urban' }] },
      { name: 'NATURE', label: 'Exterior — Nature', effect: 'Scale and impermanence. The human figure against something much larger.', insert: 'exterior, natural landscape', subOptions: [{ name: 'Forest', insert: 'exterior forest, trees and shadow' }, { name: 'Coast', insert: 'exterior coastline, sea and sky' }, { name: 'Open field', insert: 'exterior open field, unbroken horizon' }] },
    ],
  },
  'Time of day & natural light?': {
    context: "Natural light quality is determined by time of day. It is the most emotional production design decision.",
    options: [
      { name: 'GOLD', label: 'Golden Hour', effect: 'Warm, fragile, transient. The most beautiful and emotionally legible light.', insert: 'golden hour light, warm and low angle', subOptions: [{ name: 'Morning golden', insert: 'morning golden hour, warm rising light' }, { name: 'Evening golden', insert: 'evening golden hour, magic light before dusk' }, { name: 'Low angle rays', insert: 'golden low-angle rays, dramatic warmth' }] },
      { name: 'DAY', label: 'Midday Harsh', effect: 'Exposed and unforgiving. Shadowless light hides nothing.', insert: 'harsh midday sun, flat and bright', subOptions: [{ name: 'Flat overcast', insert: 'flat overcast midday, diffused harsh' }, { name: 'Direct sun', insert: 'direct midday sun, hard shadows' }, { name: 'Bleached', insert: 'bleached midday, overexposed and raw' }] },
      { name: 'WIN', label: 'Window Light', effect: 'Directional, soft, specific. The most cinematic indoor light source.', insert: 'soft window light, side directional', subOptions: [{ name: 'Side window', insert: 'side window light, directional and soft' }, { name: 'Back window', insert: 'backlit window, silhouette edge' }, { name: 'Multiple windows', insert: 'multiple windows, complex directional light' }] },
      { name: 'NIGHT', label: 'Night / Artificial', effect: 'Defined by chosen sources. What is lit and what stays dark is the story.', insert: 'night, artificial practical light sources', subOptions: [{ name: 'Lamp only', insert: 'night, single lamp source, intimate' }, { name: 'Neon night', insert: 'night, neon sign light, urban' }, { name: 'Darkness edge', insert: 'night, subject on edge of darkness' }] },
    ],
  },
  'Background details & props?': {
    context: "The background is not decoration — it's context. What surrounds the character tells their story.",
    options: [
      { name: 'EMPTY', label: 'Clean / Minimal', effect: 'All focus on the subject. Nothing competes. The character exists in a void of their own making.', insert: 'clean minimal background, no distractions', subOptions: [{ name: 'Plain wall', insert: 'plain wall background, neutral' }, { name: 'Empty room', insert: 'empty room background, void' }, { name: 'Out of focus minimal', insert: 'minimal background, out of focus' }] },
      { name: 'RICH', label: 'Detailed / Layered', effect: 'A world exists beyond the character. Depth and history in every corner.', insert: 'layered background, rich environmental detail', subOptions: [{ name: 'Bookshelves', insert: 'bookshelves and objects in background, intellectual' }, { name: 'Lived-in home', insert: 'lived-in home details in background' }, { name: 'Busy street', insert: 'busy street background, urban life layer' }] },
      { name: 'BLUR', label: 'Blurred / Bokeh', effect: 'Background exists but does not demand attention. Subject isolation with environmental context.', insert: 'blurred background, shallow depth of field', subOptions: [{ name: 'City bokeh', insert: 'city lights bokeh background' }, { name: 'Nature bokeh', insert: 'blurred nature background, organic bokeh' }, { name: 'Interior bokeh', insert: 'interior background blurred, warm' }] },
      { name: 'SYMM', label: 'Symmetric / Composed', effect: 'Deliberate, formal, controlled. The environment reflects the character\'s inner world.', insert: 'symmetrical composed background', subOptions: [{ name: 'Architectural sym.', insert: 'architectural symmetry behind subject' }, { name: 'Window centered', insert: 'centered window or door behind subject' }, { name: 'Hallway sym.', insert: 'symmetrical hallway or corridor behind' }] },
    ],
  },
  'Atmosphere: warm, cold, busy?': {
    context: "Atmosphere is the overall sensory register of the environment.",
    options: [
      { name: 'COZY', label: 'Cozy / Intimate', effect: 'Safe, warm, private. The world outside doesn\'t reach here.', insert: 'cozy intimate atmosphere, warm and close', subOptions: [{ name: 'Candlelit', insert: 'candlelit cozy atmosphere' }, { name: 'Blanket warm', insert: 'warm cozy interior, soft fabrics' }, { name: 'Small and safe', insert: 'small intimate space, world outside kept out' }] },
      { name: 'COLD', label: 'Cold / Clinical', effect: 'Distance, efficiency, or sterility. Warmth has been designed out.', insert: 'cold clinical atmosphere, minimal warmth', subOptions: [{ name: 'Hospital cold', insert: 'clinical cold atmosphere, hospital-like' }, { name: 'Empty concrete', insert: 'cold concrete atmosphere, empty and hard' }, { name: 'Fluorescent cold', insert: 'fluorescent lit cold atmosphere' }] },
      { name: 'BUSY', label: 'Busy / Energetic', effect: 'Life happening everywhere. The character is one element in a larger motion.', insert: 'busy energetic atmosphere, movement and activity', subOptions: [{ name: 'Market busy', insert: 'busy market or shopping atmosphere' }, { name: 'Street energy', insert: 'busy street energy, constant movement' }, { name: 'Party energy', insert: 'energetic party or social atmosphere' }] },
      { name: 'STILL', label: 'Still / Contemplative', effect: 'The world paused. Thought and feeling have space to exist.', insert: 'still contemplative atmosphere, quiet and present', subOptions: [{ name: 'Early morning still', insert: 'early morning stillness, world not yet awake' }, { name: 'Late night still', insert: 'late night stillness, everyone gone' }, { name: 'Nature still', insert: 'natural stillness, no human sound' }] },
    ],
  },
  // Art Style
  'Photorealistic or stylized?': {
    context: "The level of realism determines how much the audience suspends disbelief.",
    options: [
      { name: 'HYPER', label: 'Hyperrealistic', effect: 'Indistinguishable from a photograph. Skin texture, pore detail, material weight.', insert: 'hyperrealistic, photographic detail', subOptions: [{ name: 'Pore-level', insert: 'hyperrealistic, pore and skin texture visible' }, { name: 'Material weight', insert: 'hyperrealistic, fabric and material weight visible' }, { name: 'Photographic', insert: 'photographic realism, indistinguishable from photo' }] },
      { name: 'CINEM', label: 'Cinematic Real', effect: 'Realistic but with intentional color and light. The polished truth, not raw truth.', insert: 'cinematic realism, color graded and composed', subOptions: [{ name: 'Prestige TV', insert: 'prestige cinematic realism, prestige television quality' }, { name: 'Feature film', insert: 'cinematic realism, feature film grade' }, { name: 'Fashion film', insert: 'cinematic fashion film realism, polished' }] },
      { name: 'PAINT', label: 'Painterly / Soft', effect: 'Impressionistic. The world as felt, not as seen. Edges softer, colors richer.', insert: 'painterly, soft impressionistic quality', subOptions: [{ name: 'Oil painting', insert: 'painterly, oil painting texture and depth' }, { name: 'Watercolor', insert: 'soft watercolor wash, edges bleeding gently' }, { name: 'Impressionist', insert: 'impressionistic, Monet-style light and color' }] },
      { name: 'STYLZ', label: 'Graphic / Stylized', effect: 'A clear visual aesthetic imposed. Style signals intent — the world is being interpreted, not recorded.', insert: 'stylized, strong graphic aesthetic', subOptions: [{ name: 'High fashion', insert: 'highly stylized, high fashion editorial' }, { name: 'Graphic novel', insert: 'graphic novel aesthetic, bold and deliberate' }, { name: 'Anime-adjacent', insert: 'stylized anime-adjacent realism' }] },
    ],
  },
  'Film or digital? Shot on what?': {
    context: "The camera system leaves its fingerprint on the image — grain, sharpness, dynamic range.",
    options: [
      { name: 'FILMSCAN', label: 'Film Scan', effect: 'Organic grain, rich blacks, slight halation around highlights. The texture of cinema history.', insert: 'film scan, grain and organic texture', subOptions: [{ name: '35mm film', insert: '35mm film scan, cinematic grain' }, { name: '16mm', insert: '16mm film scan, coarser grain and warmth' }, { name: 'Kodak Portra', insert: 'Kodak Portra film scan, warm and creamy' }] },
      { name: 'DSLR', label: 'Digital SLR (Canon R5 / Sony A7)', effect: 'Clean, sharp, modern. The look of contemporary prestige television.', insert: 'digital DSLR, clean and sharp', subOptions: [{ name: 'Canon R5', insert: 'shot on Canon R5, high resolution clean' }, { name: 'Sony A7', insert: 'shot on Sony A7, cinematic digital look' }, { name: 'RED cinema', insert: 'shot on RED cinema camera, high-end digital' }] },
      { name: 'IPHONE', label: 'iPhone / Mobile', effect: 'Authentic, UGC-adjacent, present. The look of now, unmediated.', insert: 'shot on iPhone, mobile aesthetic', subOptions: [{ name: 'iPhone natural', insert: 'iPhone natural mode, clean mobile' }, { name: 'iPhone cinematic', insert: 'iPhone cinematic mode, shallow DOF mobile' }, { name: 'Vertical mobile', insert: 'vertical smartphone format, social media native' }] },
      { name: 'POLARD', label: 'Polaroid / Instant', effect: 'Nostalgic, imprecise, emotional. Memory made physical.', insert: 'Polaroid instant photo aesthetic', subOptions: [{ name: 'Classic Polaroid', insert: 'classic Polaroid, white border and fade' }, { name: 'Instax', insert: 'Fujifilm Instax instant, warm miniature' }, { name: 'Old instant', insert: 'aged instant photo, color shift and decay' }] },
    ],
  },
  'Editorial, cinematic, or UGC?': {
    context: "The register of the image signals its relationship to reality and to the audience.",
    options: [
      { name: 'EDIT', label: 'Editorial / Magazine', effect: 'Polished, posed, aspirational. The world at its most composed. Intentional in every detail.', insert: 'editorial, magazine quality, polished and posed', subOptions: [{ name: 'Vogue editorial', insert: 'Vogue-style editorial, high fashion polished' }, { name: 'Portrait editorial', insert: 'portrait magazine editorial, composed and lit' }, { name: 'Lifestyle editorial', insert: 'lifestyle editorial, aspirational and warm' }] },
      { name: 'CINEM', label: 'Cinematic / Narrative', effect: 'A story is being told. Dramatic light, intentional framing, emotional weight.', insert: 'cinematic, narrative quality, dramatic lighting', subOptions: [{ name: 'Feature film', insert: 'feature film cinematic quality' }, { name: 'Short film', insert: 'short film cinematic, intimate and precise' }, { name: 'Music video', insert: 'cinematic music video, stylized narrative' }] },
      { name: 'UGC', label: 'UGC / Authentic', effect: 'Casual, handheld, present. The camera is not trying — which is its own kind of try.', insert: 'UGC aesthetic, authentic and unpolished', subOptions: [{ name: 'Selfie style', insert: 'selfie aesthetic, unguarded and close' }, { name: 'Stories format', insert: 'Instagram Stories format, casual vertical' }, { name: 'Raw handheld', insert: 'raw handheld UGC, shaky and immediate' }] },
      { name: 'DOC', label: 'Documentary', effect: 'Observational. The camera witnesses without directing. Feels true even when composed.', insert: 'documentary style, observational and real', subOptions: [{ name: 'Observational doc', insert: 'observational documentary, fly-on-wall' }, { name: 'Interview style', insert: 'documentary interview, direct to camera' }, { name: 'News doc', insert: 'news documentary aesthetic, urgent and real' }] },
    ],
  },
  'Era, movement, or reference?': {
    context: "A visual era or reference gives the AI a complete aesthetic shorthand.",
    options: [
      { name: 'NOW', label: 'Contemporary', effect: 'Immediate and relatable. No period distance — the audience is in the same world.', insert: 'contemporary, present day aesthetic', subOptions: [{ name: 'Mid-2020s', insert: 'contemporary mid-2020s, current aesthetic' }, { name: 'Social native', insert: 'contemporary social media native visual' }, { name: 'Now and clean', insert: 'clean contemporary, 2024 visual language' }] },
      { name: '70S', label: '1970s Film', effect: 'Warm, grainy, personal. New Hollywood energy. Imperfect and alive.', insert: '1970s film aesthetic, warm grain', subOptions: [{ name: 'New Hollywood', insert: '1970s New Hollywood, Cassavetes or Scorsese era' }, { name: '70s grain', insert: '1970s heavy grain, warm tungsten' }, { name: '70s street', insert: '1970s street photography, Nan Goldin era' }] },
      { name: '90S', label: '1990s / 2000s', effect: 'Specific nostalgia. Digital but early, slightly desaturated, grunge-era texture.', insert: '1990s-2000s aesthetic', subOptions: [{ name: '90s grunge', insert: '1990s grunge era, desaturated and raw' }, { name: 'Y2K digital', insert: 'early 2000s Y2K digital aesthetic' }, { name: '90s fashion', insert: '1990s fashion photography, Calvin Klein era' }] },
      { name: 'CYBER', label: 'Cyberpunk / Neon', effect: 'Neon-lit, rain-slicked, technological dystopia. Saturated and dark.', insert: 'cyberpunk aesthetic, neon and rain', subOptions: [{ name: 'Blade Runner', insert: 'Blade Runner cyberpunk, neon rain and shadow' }, { name: 'Tokyo neon', insert: 'Tokyo neon night, saturated urban glow' }, { name: 'Cyber fashion', insert: 'cyberpunk fashion aesthetic, tech and neon' }] },
    ],
  },
  // Lighting
  'Key light: direction & source?': {
    context: "Where the key light comes from defines shadow — and shadow is where drama lives.",
    options: [
      { name: 'FRONT', label: 'Front / Flat', effect: 'Even light, no shadow. Clinical and exposed. The subject has nowhere to hide.', insert: 'front-lit, flat fill lighting', subOptions: [{ name: 'Ring light', insert: 'ring light front, even and clinical' }, { name: 'Beauty dish', insert: 'beauty dish front light, clean and polished' }, { name: 'Flat panel', insert: 'flat LED panel front, even exposure' }] },
      { name: 'REMBR', label: '45° Rembrandt', effect: 'The classic portrait light. Three-dimensional and human.', insert: '45° Rembrandt key light', subOptions: [{ name: 'Rembrandt left', insert: '45° Rembrandt from camera left' }, { name: 'Rembrandt right', insert: '45° Rembrandt from camera right' }, { name: 'Rembrandt high', insert: 'high Rembrandt, 45° up and to side' }] },
      { name: 'SIDE', label: 'Side / Split', effect: "Half the face in shadow. Duality and concealment.", insert: 'side split lighting', subOptions: [{ name: 'Hard split left', insert: 'hard split lighting from left, half in shadow' }, { name: 'Hard split right', insert: 'hard split lighting from right, half in shadow' }, { name: 'Window split', insert: 'window side split, natural source' }] },
      { name: 'BACK', label: 'Rim / Backlit', effect: 'Separation from background. Heroic or mysterious.', insert: 'rim lighting, backlit subject', subOptions: [{ name: 'Hard rim', insert: 'hard rim light, defined separation edge' }, { name: 'Soft backlight', insert: 'soft backlight halo, angelic separation' }, { name: 'Sun backlit', insert: 'natural sun backlit, outdoor rim' }] },
    ],
  },
  'Hard (harsh) or soft (diffused)?': {
    context: "Hard or soft is a mood decision before it is a technical one.",
    options: [
      { name: 'HARD', label: 'Hard Light', effect: 'Direct, harsh, crisp shadows. Intense, dramatic, confrontational.', insert: 'hard light, sharp shadows', subOptions: [{ name: 'Direct midday', insert: 'harsh midday direct sun, sharp shadow lines' }, { name: 'Bare bulb', insert: 'bare bulb hard light, industrial' }, { name: 'Theatrical spot', insert: 'theatrical spotlight, hard focused source' }] },
      { name: 'SOFT', label: 'Soft Light', effect: 'Diffused, gentle, no harsh edges. Intimate and warm.', insert: 'soft diffused light', subOptions: [{ name: 'Overcast', insert: 'overcast sky soft light, even and gentle' }, { name: 'Large softbox', insert: 'large softbox, studio soft light' }, { name: 'Bounced', insert: 'bounced soft light, indirect warm fill' }] },
      { name: 'MIX', label: 'Mixed', effect: 'Soft key with hard practical. Complexity and realism.', insert: 'mixed soft key and hard fill', subOptions: [{ name: 'Soft key + hard accent', insert: 'soft key light with hard accent practical' }, { name: 'Window + spot', insert: 'soft window key, hard spot for separation' }, { name: 'Natural + artificial', insert: 'natural soft plus artificial hard source' }] },
    ],
  },
  'Warm, cool, or neutral tones?': {
    context: "Color temperature is emotional temperature.",
    options: [
      { name: 'WARM', label: 'Warm / Golden', effect: 'Home, intimacy, nostalgia. The most human light.', insert: 'warm golden tones, tungsten light', subOptions: [{ name: 'Tungsten 3200K', insert: 'warm tungsten 3200K, amber gold light' }, { name: 'Candlelight', insert: 'candlelight warm, 1800K intimate glow' }, { name: 'Golden hour', insert: 'golden hour warmth, 2800K soft orange' }] },
      { name: 'COOL', label: 'Cool / Blue', effect: 'Clinical, cold, distant. Warmth removed by design.', insert: 'cool blue tones, daylight or shade', subOptions: [{ name: 'Open shade', insert: 'cool open shade, 7000K blue' }, { name: 'Overcast cool', insert: 'overcast grey-cool, 6500K' }, { name: 'Blue neon', insert: 'cool blue neon, cold and modern' }] },
      { name: 'NEUT', label: 'Neutral / Balanced', effect: 'Transparent and honest. The story sets the temperature.', insert: 'neutral balanced light, no temperature bias', subOptions: [{ name: 'Daylight 5600K', insert: 'neutral daylight 5600K, balanced' }, { name: 'Studio balanced', insert: 'studio balanced light, neutral and clean' }, { name: 'Natural neutral', insert: 'natural neutral light, no temperature lean' }] },
      { name: 'MIX', label: 'Mixed Temps', effect: 'Multiple sources at different temperatures. Feels real and complex.', insert: 'mixed color temperatures', subOptions: [{ name: 'Warm in / cool out', insert: 'warm interior with cool exterior through window' }, { name: 'Neon + daylight', insert: 'colored neon mixed with ambient daylight' }, { name: 'Many practicals', insert: 'many practical sources, each different temperature' }] },
    ],
  },
  'Shadow depth: deep or lifted?': {
    context: "Shadow depth determines contrast and how much of the image the audience can read.",
    options: [
      { name: 'DEEP', label: 'Deep / Crushed', effect: 'High contrast, moody, noir. What stays in shadow is as important as what is lit.', insert: 'deep shadows, crushed blacks', subOptions: [{ name: 'Noir crush', insert: 'deep crushed blacks, classic noir' }, { name: 'Half in darkness', insert: 'half face in crushed darkness' }, { name: 'Void shadows', insert: 'void black shadows, impenetrable dark' }] },
      { name: 'LIFT', label: 'Lifted / Airy', effect: 'Low contrast, transparent, open. Soft and non-threatening.', insert: 'lifted shadows, low contrast, airy', subOptions: [{ name: 'Matte lifted', insert: 'matte grade, shadows lifted to grey' }, { name: 'Airy pastel', insert: 'airy lifted shadows, pastel-soft' }, { name: 'Modern low con', insert: 'modern low-contrast, shadows never fully dark' }] },
      { name: 'MED', label: 'Medium / Natural', effect: 'Honest and balanced. The audience reads depth naturally.', insert: 'medium natural shadow depth', subOptions: [{ name: 'Film print medium', insert: 'medium contrast film print, natural balance' }, { name: 'Classic medium', insert: 'classic medium shadow depth, balanced' }, { name: 'Documentary medium', insert: 'medium contrast, documentary natural look' }] },
    ],
  },
  // Camera
  'Framing: ECU, CU, MCU, MS, WS?': {
    context: "Framing distance controls emotional intimacy between the subject and the audience.",
    options: [
      { name: 'ECU', label: 'Extreme Close-Up', effect: 'One detail fills the frame — eye, lips, hands. Total focus and intensity.', insert: 'extreme close-up, single detail fills frame', subOptions: [{ name: 'Eye ECU', insert: 'extreme close-up on eye, iris fills frame' }, { name: 'Lips ECU', insert: 'extreme close-up on lips, mouth only' }, { name: 'Hands ECU', insert: 'extreme close-up on hands, texture and weight' }] },
      { name: 'CU', label: 'Close-Up', effect: "The most emotionally connecting framing. The audience reads the face.", insert: 'close-up, face fills frame', subOptions: [{ name: 'Tight CU', insert: 'tight close-up, chin to forehead' }, { name: 'Standard CU', insert: 'standard close-up, face and neck' }, { name: 'Loose CU', insert: 'loose close-up, face and top of shoulders' }] },
      { name: 'MCU', label: 'Med. Close-Up', effect: 'Head and shoulders. Intimate but not claustrophobic. Dialogue standard.', insert: 'medium close-up, head and shoulders', subOptions: [{ name: 'Tight MCU', insert: 'tight medium close-up, chest to top of head' }, { name: 'Standard MCU', insert: 'standard MCU, head and shoulders framing' }, { name: 'Interview MCU', insert: 'interview medium close-up, space either side' }] },
      { name: 'MS', label: 'Medium Shot', effect: 'Waist up. Body language and face together.', insert: 'medium shot, waist up', subOptions: [{ name: 'Waist up', insert: 'medium shot, waist to top of head' }, { name: 'American shot', insert: 'American shot, mid-thigh to head' }, { name: 'Cowboy shot', insert: 'cowboy shot, holster height to head' }] },
      { name: 'WS', label: 'Wide Shot', effect: 'Full body in environment. Context and scale.', insert: 'wide shot, full body in environment', subOptions: [{ name: 'Full body wide', insert: 'wide shot, full body visible head to toe' }, { name: 'Environmental wide', insert: 'wide shot, subject small in large environment' }, { name: 'Extreme wide', insert: 'extreme wide shot, figure tiny in landscape' }] },
      { name: 'MACRO', label: 'Macro Feature', effect: 'Abstracts the subject to texture and geometry.', insert: 'macro photography detail of subject', subOptions: [{ name: 'Eye texture', insert: 'macro shot of iris texture and lashes' }, { name: 'Skin texture', insert: 'macro shot of skin pores and hair' }] },
    ],
  },
  'Angle: eye level, low, high?': {
    context: "Angle is a power relationship between camera, subject, and audience.",
    options: [
      { name: 'EYE', label: 'Eye Level', effect: 'Neutral. Peer relationship. The most honest and relatable.', insert: 'eye level angle', subOptions: [{ name: 'Direct eye level', insert: 'exact eye level, neutral peer relationship' }, { name: 'Slight below eye', insert: 'slightly below eye level, subtle power' }, { name: 'Slight above eye', insert: 'slightly above eye level, subtle intimacy' }] },
      { name: 'LOW', label: 'Low Angle', effect: 'Subject powerful or heroic. Audience looks up.', insert: 'low angle, looking up at subject', subOptions: [{ name: 'Slight low', insert: 'slightly low angle, subtle power signal' }, { name: 'Dramatic low', insert: 'dramatic low angle, strongly looking up' }, { name: 'Ground level', insert: 'ground level extreme low, subject towers' }] },
      { name: 'HIGH', label: 'High Angle', effect: 'Subject vulnerable or observed. Audience holds power.', insert: 'high angle, looking down at subject', subOptions: [{ name: 'Slight high', insert: 'slight high angle, gentle observation' }, { name: 'Overhead', insert: 'overhead high angle, subject below looking down' }, { name: 'Bird\'s eye', insert: 'bird\'s eye view, directly above looking down' }] },
      { name: 'DUTCH', label: 'Dutch Tilt', effect: 'Off-kilter, unease, psychological instability.', insert: 'dutch tilt, canted angle', subOptions: [{ name: 'Slight dutch', insert: 'subtle dutch tilt, just off-balance' }, { name: 'Strong dutch', insert: 'strong dutch tilt, dramatically canted' }, { name: 'Dutch + low', insert: 'dutch tilt combined with low angle' }] },
    ],
  },
  'Lens & focal length?': {
    context: "Focal length shapes how space feels — compressed or expansive.",
    options: [
      { name: '35MM', label: '35mm Wide', effect: 'Environmental, observational, present. Documentary intimacy.', insert: '35mm lens, wide and environmental', subOptions: [{ name: '28mm', insert: '28mm wide, strong environment' }, { name: '35mm standard', insert: '35mm, wide observational classic' }, { name: 'Wide environmental', insert: 'wide 35mm capturing full environment' }] },
      { name: '50MM', label: '50mm Normal', effect: 'Natural human eye. Honest and unmanipulative.', insert: '50mm lens, natural perspective', subOptions: [{ name: '50mm standard', insert: '50mm, natural human eye perspective' }, { name: '45mm', insert: '45mm, near-normal, slightly open' }, { name: '55mm', insert: '55mm, normal with slight compression start' }] },
      { name: '85MM', label: '85mm Portrait', effect: 'Flattering compression, subject isolation, creamy bokeh.', insert: '85mm portrait lens, soft background', subOptions: [{ name: '85mm classic', insert: '85mm classic portrait, flattering compression' }, { name: '100mm', insert: '100mm, strong portrait compression, isolating' }, { name: '105mm macro', insert: '105mm macro portrait, intimate close detail' }] },
      { name: 'TELE', label: 'Telephoto 135mm+', effect: 'Space compressed, subject watched from distance.', insert: 'telephoto lens, 135mm+, compressed space', subOptions: [{ name: '135mm', insert: '135mm telephoto, distance and compression' }, { name: '200mm', insert: '200mm strong compression, surveillance' }, { name: '400mm+', insert: '400mm super telephoto, extreme distance' }] },
    ],
  },
  'DOF: bokeh or sharp background?': {
    context: "Depth of field determines what the audience is allowed to see clearly.",
    options: [
      { name: 'BOKEH', label: 'Shallow / Bokeh', effect: 'Subject isolated, background dissolves. Total visual focus on one thing.', insert: 'shallow DOF, creamy bokeh, isolated subject', subOptions: [{ name: 'f/1.4 razor', insert: 'f/1.4 razor shallow, subject only in focus' }, { name: 'f/2 creamy', insert: 'f/2 creamy bokeh, soft isolation' }, { name: 'f/2.8 portrait', insert: 'f/2.8 portrait bokeh, natural isolation' }] },
      { name: 'MED', label: 'Moderate', effect: 'Subject clear, background soft but readable. Subject and world coexist.', insert: 'moderate DOF, subject sharp, background soft', subOptions: [{ name: 'f/4 moderate', insert: 'f/4 moderate depth, context visible' }, { name: 'f/5.6 context', insert: 'f/5.6, subject and background both readable' }, { name: 'Environmental', insert: 'moderate DOF, subject and environment coexist' }] },
      { name: 'DEEP', label: 'Deep Focus', effect: 'Everything sharp. The audience can read the whole frame — foreground to background.', insert: 'deep focus, sharp throughout', subOptions: [{ name: 'f/8 deep', insert: 'f/8 deep focus, near and far both sharp' }, { name: 'f/11 landscape', insert: 'f/11 landscape deep focus' }, { name: 'Citizen Kane', insert: 'f/16+ deep focus, Citizen Kane style' }] },
    ],
  },
};

// ─── God Mode Node ─────────────────────────────────────────────────────────────

export interface GodModeNode {
  id: string;
  projectId: string;
  title: string;      // user-editable label, e.g. "Brand Rules", "Style Guide"
  text: string;       // instructions always injected into every prompt
  isEnabled: boolean; // on/off toggle
  x: number;
  y: number;
  width: number;
  isMinimized: boolean;
  createdAt: number;
  connectedImageIds: string[]; // image/video nodes linked to this god mode node
}

// ─── Undo History ─────────────────────────────────────────────────────────────

export interface UndoEntry {
  type: 'move' | 'text-edit' | 'delete' | 'add';
  timestamp: number;
  data: unknown;
}
