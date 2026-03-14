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

export interface DirectorOption {
  name: string;      // short code shown as chip, e.g. "ECU"
  label?: string;    // full name, e.g. "Extreme Close-Up"
  effect: string;    // what this choice does to the audience/story
  insert: string;    // text appended to the note when clicked
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
      { name: 'ECU', label: 'Extreme Close-Up', effect: 'Isolates one micro-detail — an eye, a finger, a key. Forces the audience to focus on exactly one thing. Intimacy, dread, or revelation.', insert: 'extreme close-up' },
      { name: 'CU', label: 'Close-Up', effect: "The most emotionally connecting shot in cinema. The audience reads the character's face. Dialogue hits hardest here.", insert: 'close-up' },
      { name: 'MCU', label: 'Med. Close-Up', effect: 'Intimate but includes shoulders. The workhorse of dialogue scenes — personal without being claustrophobic.', insert: 'medium close-up' },
      { name: 'MS', label: 'Medium Shot', effect: 'Reveals body language alongside face. Connects physical action to emotional state.', insert: 'medium shot' },
      { name: 'WS', label: 'Wide Shot', effect: 'Full body in environment. Establishes context, can convey isolation or scale.', insert: 'wide shot' },
      { name: 'ELS', label: 'Extreme Long', effect: 'The character is tiny in the frame. Signals powerlessness, vastness, or destiny.', insert: 'extreme long shot' },
    ],
  },
  'Camera movement?': {
    context: 'Camera movement is an emotional statement. A still camera waits; a moving camera seeks.',
    options: [
      { name: 'STATIC', label: 'Locked-Off', effect: 'All dramatic weight falls on the actor. The frame holds — the emotion must fill it. Used for control and inevitability.', insert: 'static, locked-off' },
      { name: 'PUSH', label: 'Dolly In', effect: 'Slowly closes distance. Builds tension, intimacy, or dread. The audience is drawn in whether they want to be or not.', insert: 'slow dolly push-in' },
      { name: 'PULL', label: 'Dolly Out', effect: 'Reveals the wider world as the character recedes. Signals isolation, loss, or an overwhelming situation.', insert: 'dolly pull-out, retreating' },
      { name: 'PAN', label: 'Horizontal Pan', effect: 'Follows action or reveals space. Can connect two subjects in one unbroken observation.', insert: 'slow pan' },
      { name: 'HH', label: 'Handheld', effect: 'Adds presence and unease. Makes the scene feel observed, raw, real. The audience becomes a witness.', insert: 'handheld, observational' },
      { name: 'STEAD', label: 'Steadicam', effect: 'Floats through space — neither fully stable nor shaky. Dreamlike and inevitable. Think The Shining.', insert: 'steadicam float' },
      { name: 'WHIP', label: 'Whip Pan', effect: 'Cuts time or creates kinetic energy. Used for comedy, urgency, or disorientation.', insert: 'whip pan' },
    ],
  },
  'Angle?': {
    context: 'Angle is a power relationship. Where the camera sits determines how the audience feels about the subject.',
    options: [
      { name: 'EYE', label: 'Eye Level', effect: 'Neutral. The audience is a peer. The most honest and relatable angle. Nothing is implied about power.', insert: 'eye-level angle' },
      { name: 'LOW', label: 'Low Angle', effect: 'Subject appears powerful, threatening, or heroic. The audience literally looks up at them.', insert: 'low angle, looking up' },
      { name: 'HIGH', label: 'High Angle', effect: 'Subject appears small, vulnerable, or watched. The audience holds the power position.', insert: 'high angle, looking down' },
      { name: 'DUTCH', label: 'Dutch Tilt', effect: 'Off-kilter world. Creates unease, psychological instability, or threat. Use sparingly — loses impact fast.', insert: 'dutch tilt angle' },
      { name: 'OVH', label: "Overhead", effect: 'Subjects become patterns or pieces on a board. Removes humanity — creates surveillance or fate.', insert: "overhead bird's-eye" },
      { name: 'WORM', label: "Worm's Eye", effect: "Extreme authority or scale. The subject towers over the viewer. Powerful because it's so rarely used.", insert: "worm's eye angle" },
    ],
  },
  'Framing?': {
    context: 'Where you place the subject tells the audience where to look — and what the subject means.',
    options: [
      { name: 'THIRDS', label: 'Rule of Thirds', effect: 'Natural, dynamic tension. Subject slightly off-center with visual breathing room in their eyeline direction.', insert: 'rule of thirds framing' },
      { name: 'CENTER', label: 'Centered / Symmetric', effect: "Confrontational and iconic. The subject can't be avoided. Conveys inevitability and control.", insert: 'centered, symmetrical framing' },
      { name: 'OTS', label: 'Over-the-Shoulder', effect: 'Grounds dialogue in physical space. Audience is behind one character, watching the other.', insert: 'over-the-shoulder framing' },
      { name: 'POV', label: 'Point of View', effect: "The audience inhabits the character. Creates immediate empathy — or immediate horror — depending on what's seen.", insert: 'POV, first-person perspective' },
      { name: 'NEG', label: 'Negative Space', effect: 'Subject is small in frame. Empty space communicates isolation, weight of thought, or environment as character.', insert: 'subject in negative space' },
    ],
  },
  // ── SUBJECT ──
  'Who / what is in frame?': {
    context: 'What your camera points at is your story. The choice of subject defines what the scene is about.',
    options: [
      { name: 'LEAD', label: 'Single Subject', effect: 'All attention on one person or thing. Concentration, vulnerability, and focus.', insert: 'single subject, isolated in frame' },
      { name: '2-SHOT', label: 'Two-Shot', effect: 'Relationship visible in one frame. Power dynamic and tension readable without a cut.', insert: 'two-shot, both subjects in frame' },
      { name: 'GROUP', label: 'Ensemble', effect: 'Complex social dynamics. Multiple faces create shifting attention and community or conflict.', insert: 'ensemble, multiple subjects' },
      { name: 'DETAIL', label: 'Detail / Prop', effect: 'The object carries meaning. A ring, a photo, a weapon. When the camera looks at it, so does the audience.', insert: 'detail shot, prop in focus' },
      { name: 'ENV', label: 'Environment Only', effect: 'No human presence. Location as character. Sets tone before anyone enters.', insert: 'empty environment, no subject present' },
    ],
  },
  'Pose / position?': {
    context: 'Body language speaks before dialogue. Physicality reveals what characters try to conceal.',
    options: [
      { name: 'STAND', label: 'Standing / Upright', effect: 'Alert, ready, or presenting. Upright posture signals control and engagement.', insert: 'standing, upright posture' },
      { name: 'SIT', label: 'Seated / Still', effect: 'Settled or trapped. Stillness can mean peace or paralysis depending on context.', insert: 'seated, still' },
      { name: 'WALK', label: 'Walking / Moving', effect: 'Purposeful or aimless — the speed and direction tell the story.', insert: 'walking, in motion' },
      { name: 'BACK', label: 'Back to Camera', effect: 'Mystery, departure, or rejection. The audience sees what the character faces, not their expression.', insert: 'back to camera, facing away' },
      { name: 'PROFIL', label: 'Profile / Side-On', effect: 'Observation without acknowledgment. Contemplative or isolated.', insert: 'profile, side-on to camera' },
    ],
  },
  'Expression?': {
    context: 'Expression is the primary emotional signal. It tells the audience what to feel.',
    options: [
      { name: 'NEUT', label: 'Neutral / Unreadable', effect: 'Ambiguity the audience fills in. Uncomfortable and magnetic when held long enough.', insert: 'neutral expression, unreadable' },
      { name: 'DET', label: 'Determined / Resolved', effect: 'Intent and agency. The character has decided something. Audiences respect this.', insert: 'determined, set jaw expression' },
      { name: 'FEAR', label: 'Fear / Dread', effect: 'Primal. The audience mirrors this instinctively — their own threat response activates.', insert: 'fearful expression, wide eyes' },
      { name: 'GRIEF', label: 'Grief / Sorrow', effect: "The most empathy-generating expression in film. Audiences lean toward it.", insert: 'grief, sorrowful expression' },
      { name: 'STOIC', label: 'Stoic / Concealed', effect: 'What is being held back? Restraint generates more tension than overt emotion.', insert: 'stoic, emotion concealed' },
      { name: 'JOY', label: 'Genuine Joy', effect: 'Rare in film — which is why it lands so hard when it appears authentically.', insert: 'genuine joy, open expression' },
    ],
  },
  'Wardrobe details?': {
    context: "Clothing is visual shorthand for character. What they wear and how they wear it tells a story before they speak.",
    options: [
      { name: 'WORN', label: 'Worn / Distressed', effect: 'Life has happened to this person. Struggle, history, and authenticity.', insert: 'worn, distressed clothing, lived-in texture' },
      { name: 'SHARP', label: 'Sharp / Tailored', effect: 'Control, ambition, or armor. The person who dresses perfectly may be hiding something.', insert: 'sharp tailored clothing, polished' },
      { name: 'CASUAL', label: 'Casual / Relaxed', effect: 'Off-guard. The real person, not the performed version.', insert: 'casual, relaxed clothing' },
      { name: 'UNIFORM', label: 'Uniform / Institutional', effect: 'Identity subsumed into a role. Military, medical, corporate — the person serves the system.', insert: 'uniform, institutional dress' },
      { name: 'CONTRAST', label: 'Contrast with Setting', effect: 'A suit in a slum, rags in a palace — visual dissonance that signals displacement or danger.', insert: 'clothing contrasts sharply with environment' },
    ],
  },
  // ── ACTION ──
  'What happens?': {
    context: 'Every moment should change something — even if only what the audience knows.',
    options: [
      { name: 'PHYS', label: 'Physical Action', effect: 'A body doing something. Running, fighting, building, breaking. Kinetic and visceral.', insert: 'physical action, body in motion' },
      { name: 'REACT', label: 'Emotional Reaction', effect: "The character receives information and responds. Often more powerful than the action that caused it.", insert: 'emotional reaction, internal response' },
      { name: 'REVEAL', label: 'Discovery / Reveal', effect: 'Something previously unknown becomes visible — to the character, the audience, or both.', insert: 'discovery, revelation moment' },
      { name: 'WAIT', label: 'Waiting / Stillness', effect: "Nothing happens — but anticipation builds. The audience waits with the character.", insert: 'stillness, anticipatory waiting' },
      { name: 'DEPART', label: 'Departure / Exit', effect: 'Someone or something leaves. The frame after they go says everything.', insert: 'departure, character exits frame' },
    ],
  },
  'Speed / pacing?': {
    context: 'Time is one of cinema\'s most powerful tools. You can stretch it, compress it, or shatter it.',
    options: [
      { name: 'REAL', label: 'Real-Time', effect: 'Clock-accurate. Tension builds because the audience feels every second passing.', insert: 'real-time pacing' },
      { name: 'SLO', label: 'Slow Motion', effect: 'Elevates the moment to mythic status. Used for beauty, grief, violence, or revelation.', insert: 'slow motion' },
      { name: 'RAMP', label: 'Speed Ramp', effect: 'Starts fast, slows to slo-mo on the key beat. Punctuates the most important moment.', insert: 'speed ramp, fast to slow-motion' },
      { name: 'FAST', label: 'Accelerated', effect: 'Time passes visibly. Used for urgency, time-lapse montage, or comic energy.', insert: 'accelerated, fast motion' },
      { name: 'FREEZE', label: 'Freeze Frame', effect: 'Time stops completely. Often held on a moment of consequence — the last image frozen.', insert: 'freeze frame, held moment' },
    ],
  },
  'Key beat?': {
    context: 'Every scene exists to reach one moment. Everything before it is setup — this is what you\'re building toward.',
    options: [
      { name: 'PEAK', label: 'Climax / Peak', effect: "The scene's entire energy arrives here. Camera and performance should feel the weight.", insert: 'climax, peak of scene' },
      { name: 'TURN', label: 'Turning Point', effect: 'Something shifts irrevocably. The character — or the audience — understands something new.', insert: 'turning point, pivotal shift' },
      { name: 'QUIET', label: 'Quiet Beat', effect: "Nothing happens — but everything is felt. The scene breathes. Often the most remembered beat.", insert: 'quiet emotional beat, held stillness' },
      { name: 'REVL', label: 'Revelation', effect: 'Information releases to the audience. They re-read everything that came before.', insert: 'revelation, information release' },
      { name: 'FIRST', label: 'First Look', effect: "The moment a character sees something for the first time. Their face is the shot.", insert: 'first look, moment of seeing' },
    ],
  },
  'Transition out?': {
    context: 'How you leave a scene is as expressive as how you enter it. The cut carries meaning.',
    options: [
      { name: 'HARD', label: 'Hard Cut', effect: 'Abrupt, rhythmic, modern. No transition at all — just the next thing. The default and the most common.', insert: 'hard cut to next scene' },
      { name: 'SMASH', label: 'Smash Cut', effect: 'Violent juxtaposition. Contrast between scenes creates the meaning — shock or dark humor.', insert: 'smash cut, jarring contrast' },
      { name: 'DISS', label: 'Dissolve', effect: 'Time passes, or things blend. Soft and retrospective. Signals memory or gentle passage.', insert: 'dissolve transition' },
      { name: 'FADE', label: 'Fade to Black', effect: 'The scene ends completely. Finality, sleep, death, or chapter close.', insert: 'fade to black' },
      { name: 'MATCH', label: 'Match Cut', effect: 'Shape, movement, or color rhymes between scenes. One of cinema\'s most elegant tools.', insert: 'match cut, visual rhyme' },
      { name: 'L-CUT', label: 'L-Cut / J-Cut', effect: "Sound precedes or trails the image. The most cinematic way to cut dialogue — keeps scenes breathing.", insert: 'L-cut, sound leads picture' },
    ],
  },
  // ── ENVIRONMENT ──
  'Location / setting?': {
    context: "Location is not backdrop — it's a character. Where the scene happens shapes everything in it.",
    options: [
      { name: 'INT', label: 'Interior', effect: 'Controlled, confined. Can feel safe, claustrophobic, or intimate depending on execution.', insert: 'interior, enclosed space' },
      { name: 'EXT', label: 'Exterior', effect: 'Exposed, open, subject to weather and natural light. Characters are smaller against the world.', insert: 'exterior, outdoor location' },
      { name: 'URBAN', label: 'Urban / City', effect: 'Energy, anonymity, noise. The city is indifferent to your characters — which can be devastating.', insert: 'urban setting, city environment' },
      { name: 'NATURE', label: 'Natural Landscape', effect: "Nature dwarfs human problems — or makes them feel appropriate to the scale of the world.", insert: 'natural landscape, wilderness' },
      { name: 'INDUST', label: 'Industrial', effect: 'Inhuman scale, dehumanizing geometry. Characters feel like components in a machine.', insert: 'industrial environment, machinery and concrete' },
    ],
  },
  'Time of day?': {
    context: 'Light changes everything. The same location tells a completely different story at different times of day.',
    options: [
      { name: 'DAWN', label: 'Dawn / Golden Hour', effect: 'Warm and fragile — hopeful, or the light before a terrible day begins. Used for beginnings and final moments alike.', insert: 'dawn, golden hour light' },
      { name: 'DAY', label: 'Midday / Harsh Sun', effect: 'Exposed, shadowless, brutal. Nothing hides in flat midday light.', insert: 'midday, harsh overhead sun' },
      { name: 'AFTN', label: 'Late Afternoon', effect: 'Long shadows at low angle. Warm but running out. Feels like time is slipping away.', insert: 'late afternoon, low warm light' },
      { name: 'MAGIC', label: 'Magic Hour / Sunset', effect: "Short-lived and beautiful. The most emotional light in cinema. Used for scenes that must be felt.", insert: 'magic hour, sunset light' },
      { name: 'BLUE', label: 'Dusk / Blue Hour', effect: 'Cool, melancholic, transitional. The world has turned from warm to cold — sense of ending.', insert: 'dusk, blue hour' },
      { name: 'NIGHT', label: 'Night', effect: 'Defined by what you choose to illuminate. Secrets, danger, freedom, intimacy.', insert: 'night, artificial light sources' },
    ],
  },
  'Weather?': {
    context: "Weather is mood made visible. It's the cheapest production design decision with the biggest emotional return.",
    options: [
      { name: 'CLEAR', label: 'Clear / Blue Sky', effect: 'Neutral or optimistic. But terrible things can happen in beautiful weather — the contrast is its own statement.', insert: 'clear sky, bright conditions' },
      { name: 'OCAST', label: 'Overcast', effect: 'Soft, even, shadowless. Melancholic, restrained, and honest. The mood of aftermath.', insert: 'overcast, soft diffused light' },
      { name: 'RAIN', label: 'Rain', effect: "Cinema's most reliable emotional amplifier. Grief, longing, cleansing, chaos.", insert: 'rain, wet surfaces and reflections' },
      { name: 'FOG', label: 'Fog / Mist', effect: 'Obscures the world. Creates mystery, isolation, and the sense that something is hidden just out of frame.', insert: 'fog, mist, reduced visibility' },
      { name: 'SNOW', label: 'Snow', effect: 'Silence, purity, isolation, or death depending on context. Snow muffles the world.', insert: 'snow, white landscape' },
    ],
  },
  'Era / period?': {
    context: "When your story is set changes how the audience reads every costume, prop, and behavior.",
    options: [
      { name: 'NOW', label: 'Contemporary', effect: 'Immediate and relatable. No period distance — the audience is in the same world.', insert: 'contemporary, present day' },
      { name: '70s', label: '1970s', effect: 'Grain, earth tones, natural chaos. The decade of New Hollywood — personal, imperfect, alive.', insert: '1970s aesthetic, warm film grain' },
      { name: '80s', label: '1980s', effect: 'Neon, synth, ambition. High-contrast and stylized — feels both retro and timeless.', insert: '1980s, neon and synth aesthetic' },
      { name: 'Y2K', label: 'Y2K / Early 2000s', effect: 'Plastic, digital, optimistic and anxious at once. Specific nostalgia for a generation.', insert: 'Y2K aesthetic, early 2000s' },
      { name: 'NRFTR', label: 'Near Future', effect: 'Familiar but wrong. Small technological differences that make the world feel slightly off.', insert: 'near future, 10-20 years ahead' },
    ],
  },
  // ── LIGHTING ──
  'Key light direction?': {
    context: 'Where your key light comes from defines the shadow — and shadow is where drama lives.',
    options: [
      { name: 'FRONT', label: 'Front / Flat', effect: 'Even light, no shadow. Clinical and exposed. The subject has nowhere to hide.', insert: 'front-lit, flat lighting' },
      { name: 'REMBR', label: '45° Rembrandt', effect: 'The classic portrait light. Three-dimensional and human. A small triangle of light on the shadow-side cheek.', insert: '45° Rembrandt lighting' },
      { name: 'SPLIT', label: 'Side / Split', effect: "Half the face in shadow. Duality, internal conflict, concealment. What are they not showing?", insert: 'side-split lighting, half face in shadow' },
      { name: 'RIM', label: 'Back / Rim', effect: 'Separation from background. The character is outlined against their world. Heroic or mysterious.', insert: 'rim lighting, backlit' },
      { name: 'UNDER', label: 'Under / Up Light', effect: "Horror's signature. Unnatural shadow direction creates immediate, deep unease.", insert: 'under-light, upward light source' },
      { name: 'TOP', label: 'Top / Down', effect: 'Oppressive and dramatic. Noir interrogation. Weight from above.', insert: 'top-down overhead lighting' },
    ],
  },
  'Quality (hard/soft)?': {
    context: 'Hard or soft light is a mood decision. Hard = conflict and exposure. Soft = warmth and intimacy.',
    options: [
      { name: 'HARD', label: 'Hard Light', effect: 'Direct source — harsh sun, bare bulb. Sharp, crisp shadows. Intense, dramatic, confrontational.', insert: 'hard light, sharp crisp shadows' },
      { name: 'SOFT', label: 'Soft Light', effect: 'Diffused — overcast, bounce, softbox. Gentle gradients, no harsh edges. Intimate and warm.', insert: 'soft, diffused light' },
      { name: 'MIXED', label: 'Mixed', effect: 'Complexity and realism. A soft key with a hard practical fill creates visual interest.', insert: 'mixed light quality, soft key and hard fill' },
    ],
  },
  'Color temp?': {
    context: 'Color temperature is emotional temperature. Warm feels human; cool feels clinical or threatening.',
    options: [
      { name: 'WARM', label: 'Warm ~3200K', effect: 'Orange-gold tones. Home, intimacy, firelight, nostalgia. The warmest light feels the most human.', insert: 'warm tungsten light, ~3200K' },
      { name: 'NEUT', label: 'Neutral ~5600K', effect: 'Balanced, truthful, neither warm nor cool. Transparent — the story sets the temperature.', insert: 'neutral daylight, ~5600K' },
      { name: 'COOL', label: 'Cool ~7000K', effect: 'Blue-white. Clinical, isolated, cold, or futuristic. Warmth is absent by design.', insert: 'cool shade light, ~7000K' },
      { name: 'MIX', label: 'Mixed Temps', effect: 'Multiple sources at different temperatures. Feels real — the world has multiple light sources.', insert: 'mixed color temperatures in scene' },
      { name: 'NEON', label: 'Neon / Colored', effect: 'Deliberate, expressive color. Non-naturalistic — used for mood, genre, or visual style.', insert: 'deliberate colored light, neon palette' },
    ],
  },
  'Practicals in scene?': {
    context: "Practicals are visible light sources in frame. They ground the scene in a real, inhabited world.",
    options: [
      { name: 'LAMP', label: 'Table / Floor Lamp', effect: 'Domestic and intimate. Creates pools of warm light — the world outside the lamp feels darker.', insert: 'practical table lamp, warm pool of light' },
      { name: 'WINDOW', label: 'Window / Natural', effect: 'The most beautiful practical. Directional, soft, and real. Changes with time of day.', insert: 'window light as practical, natural source' },
      { name: 'SCREEN', label: 'TV / Phone / Screen', effect: 'Cool blue flicker. Surveillance, isolation, and modernity. The character is lit by their world.', insert: 'screen light, TV or phone glow' },
      { name: 'CANDLE', label: 'Candle / Flame', effect: 'Primal, intimate, and precarious. Flame light is alive — it moves, it can go out.', insert: 'candlelight, open flame practical' },
      { name: 'NEON', label: 'Neon Sign', effect: 'Hard, colored, commercial. Places the scene in a specific urban world.', insert: 'neon sign practical, colored commercial light' },
    ],
  },
  // ── TEXTURE ──
  'Film look / grain?': {
    context: 'Grain is not a flaw — it\'s a choice. It signals time period, authenticity, and emotional texture.',
    options: [
      { name: 'CLEAN', label: 'Clean Digital', effect: 'Crisp, modern, hyperreal. Can feel clinical or documentary — present-tense and unfiltered.', insert: 'clean digital, no grain' },
      { name: 'FINE', label: 'Fine Grain ~ISO400', effect: 'Subtle texture. Quality film photography. Warm presence without distraction.', insert: 'fine film grain, ISO 400' },
      { name: 'HEAVY', label: 'Heavy Grain ~ISO3200', effect: 'Raw, urgent, documentary energy. Feels lived-in and real. Often paired with handheld.', insert: 'heavy grain, high ISO film look' },
      { name: '16MM', label: '16mm Film', effect: 'Counter-culture, indie, intimate. The look of New Hollywood and documentary realism.', insert: '16mm film scan, visible grain and softness' },
      { name: 'VHS', label: 'VHS / Video', effect: 'Nostalgia, memory, home footage. Signals a specific time and emotional register.', insert: 'VHS video look, tape artifacts' },
    ],
  },
  'Lens character?': {
    context: 'The lens personality shapes the audience\'s relationship to the image — clinical vs. dreamy, modern vs. vintage.',
    options: [
      { name: 'SHARP', label: 'Clinical / Sharp', effect: 'Modern, technical, unromantic. Every detail is exposed. Can feel cold or authoritative.', insert: 'clinical sharp lens, modern glass' },
      { name: 'VNTG', label: 'Vintage Glass', effect: 'Flare, aberration, softness at edges. Imperfection adds warmth and humanity.', insert: 'vintage glass, lens flare and aberration' },
      { name: 'ANAM', label: 'Anamorphic', effect: 'Oval bokeh, horizontal lens flares. The language of prestige cinema — wide and epic.', insert: 'anamorphic lens, oval bokeh, horizontal flares' },
      { name: 'DREAM', label: 'Dreamy / Diffused', effect: 'Soft, glowing edges. Memory, romance, or fragile beauty. The world seen through emotion.', insert: 'dreamy soft lens, diffused glow' },
    ],
  },
  'Color grade style?': {
    context: 'The grade is your final emotional statement over the entire image. It unifies everything.',
    options: [
      { name: 'NAT', label: 'Natural / True', effect: 'Honest and transparent. The grade steps back. Used in documentary and realist drama.', insert: 'natural color grade, minimal processing' },
      { name: 'DESAT', label: 'Desaturated', effect: 'Washed out, world-weary. Color drained from things — grief, exhaustion, aftermath.', insert: 'desaturated, muted palette' },
      { name: 'T&O', label: 'Teal & Orange', effect: "Hollywood's signature. Warm skin tones against cool shadows. Cinematic contrast.", insert: 'teal and orange grade' },
      { name: 'BLEACH', label: 'Bleach Bypass', effect: "High contrast, desaturated, metallic. Gritty war films and intense drama. Saving Private Ryan.", insert: 'bleach bypass, silver retention look' },
      { name: 'MONO', label: 'Monochrome / B&W', effect: 'Strips reality to light and shadow. Timeless and formal. Forces composition to the front.', insert: 'monochrome, black and white' },
    ],
  },
  'VFX / comp notes?': {
    context: "Visual effects are a tool, not a goal. The best VFX are invisible — they serve the story.",
    options: [
      { name: 'PRAC', label: 'Practical In-Camera', effect: 'Real elements in the real world. Audiences feel the difference even if they cannot name it.', insert: 'practical in-camera effects' },
      { name: 'CGI', label: 'CGI Composite', effect: 'Digital environments or elements added in post. Requires careful lighting match to feel real.', insert: 'CGI composite, digital background' },
      { name: 'FLARE', label: 'Lens Flare / Leaks', effect: 'Organic imperfections that make digital footage feel more like film. Warmth and nostalgia.', insert: 'lens flares, light leaks' },
      { name: 'PART', label: 'Particle FX', effect: 'Dust, smoke, rain, sparks. Adds atmosphere and three-dimensionality to a scene.', insert: 'particle effects, atmospheric depth' },
    ],
  },
  // ── AUDIO ──
  'Diegetic sounds?': {
    context: "Diegetic sound exists in the world of the scene. Characters can hear it. It makes the world real.",
    options: [
      { name: 'FEET', label: 'Footsteps / Movement', effect: 'Grounds physical presence. We feel the character in the space.', insert: 'footsteps, movement sounds' },
      { name: 'ENV', label: 'Environmental Ambience', effect: 'Wind, traffic, insects — the ambient texture that tells us where we are.', insert: 'environmental ambience, location sound' },
      { name: 'VOICES', label: 'Crowd / Background', effect: 'Other people exist. Isolation is louder when we can hear the world carrying on without them.', insert: 'background voices, crowd murmur' },
      { name: 'MECH', label: 'Mechanical / Clock', effect: 'Ticking, machinery, phones — signals time pressure or inhuman systems at work.', insert: 'mechanical sounds, ticking, machinery' },
      { name: 'SIL', label: 'Near Silence', effect: 'The most powerful sound choice. Total silence is deafening in a film context.', insert: 'near silence, minimal diegetic sound' },
    ],
  },
  'Score / music style?': {
    context: 'Music tells the audience what to feel. Use it with intention — it is the most direct line to emotion.',
    options: [
      { name: 'ORCH', label: 'Orchestral', effect: 'Sweeping and emotional. Signals scale and narrative importance. The language of cinema itself.', insert: 'orchestral score, sweeping strings' },
      { name: 'SYNTH', label: 'Electronic / Synth', effect: 'Cold, modern, or retro-futuristic. Controls and distances the audience — or creates propulsive energy.', insert: 'electronic score, synthesizer' },
      { name: 'DRONE', label: 'Ambient / Drone', effect: "Creates unease without melody. The audience can't name what they're feeling — which makes it more powerful.", insert: 'ambient drone, atonal texture' },
      { name: 'ACOUS', label: 'Acoustic / Folk', effect: 'Warm, immediate, human. Makes grief or loss feel personal rather than epic.', insert: 'acoustic, folk-style score' },
      { name: 'NONE', label: 'No Score / Silence', effect: "The most daring choice. Without music, the audience must generate their own emotional response.", insert: 'no score, silence' },
    ],
  },
  'Dialogue / VO?': {
    context: "What is heard — and what is left unspoken — shapes meaning as much as any visual.",
    options: [
      { name: 'ONSCR', label: 'On-Screen Dialogue', effect: 'Characters speaking to each other. Relationship and conflict through language.', insert: 'on-screen dialogue, characters speaking' },
      { name: 'VO', label: 'Voice-Over Narration', effect: 'A character speaking across time — memory, perspective, or reflection on what is seen.', insert: 'voice-over narration' },
      { name: 'INNER', label: 'Internal Monologue', effect: "We hear what the character thinks, not says. Intimacy and dramatic irony — we know more than others do.", insert: 'internal monologue, unspoken thoughts' },
      { name: 'SILENT', label: 'No Dialogue', effect: 'Pure visual storytelling. Trust the image. The audience fills the silence with their own meaning.', insert: 'no dialogue, silent scene' },
    ],
  },
  'Silence / ambient?': {
    context: "The spaces between sounds carry as much weight as the sounds themselves.",
    options: [
      { name: 'DEAD', label: 'Dead Silence', effect: 'No sound at all. Deeply unnerving — the world has stopped. Use for shock or profound stillness.', insert: 'dead silence, no ambient sound' },
      { name: 'ROOM', label: 'Room Tone', effect: 'The gentle hum of a space. Feels real and inhabited without drawing attention to itself.', insert: 'room tone, subtle ambient hum' },
      { name: 'NAT', label: 'Natural Ambient', effect: 'Wind, birds, water — the sound of a world that does not care about the story.', insert: 'natural ambient, outdoor environment sound' },
      { name: 'CONTR', label: 'Contrast / Drop', effect: 'A loud scene cuts to sudden quiet — or quiet scene erupts. The drop or eruption carries the emotional punch.', insert: 'sound contrast, sudden quiet after noise' },
    ],
  },
  // ── MOOD ──
  'Emotional tone?': {
    context: 'Every shot has an emotional temperature. Be intentional about what you are asking the audience to feel.',
    options: [
      { name: 'TENSE', label: 'Tense / Threatening', effect: 'The audience feels danger without action. Silence, tight framing, slow movement create this.', insert: 'tense, threatening atmosphere' },
      { name: 'MELAN', label: 'Melancholic', effect: 'Loss that has already happened. Soft light, still camera, muted palette, silence.', insert: 'melancholic, sorrowful tone' },
      { name: 'MENAC', label: 'Menacing', effect: 'Something bad is near. Low angles, deep shadow, deliberate unhurried movement.', insert: 'menacing, sinister undercurrent' },
      { name: 'SEREN', label: 'Serene / Peaceful', effect: 'Peace — but in cinema, peace often precedes its opposite. Use carefully; audiences will wait for the break.', insert: 'serene, peaceful atmosphere' },
      { name: 'HOPE', label: 'Hopeful', effect: 'Light in darkness. The scene does not resolve — but something could.', insert: 'hopeful, searching tone' },
      { name: 'JOY', label: 'Joyful / Warm', effect: 'Warmth in the image and movement. The camera moves with the energy, not against it.', insert: 'joyful, warm energy' },
    ],
  },
  'Tension level?': {
    context: 'Tension is managed across a scene, not just present or absent. Build it — then you must release it.',
    options: [
      { name: 'CALM', label: 'Calm / Baseline', effect: 'Establish this before you take it away. The audience needs a baseline to feel the contrast.', insert: 'calm, peaceful baseline' },
      { name: 'UNEASE', label: 'Subtle Unease', effect: 'Something is slightly wrong. The audience senses it before they can name it.', insert: 'subtle unease, something slightly off' },
      { name: 'BUILD', label: 'Building Dread', effect: 'Every beat increases the pressure. The audience cannot look away.', insert: 'building dread, escalating tension' },
      { name: 'PEAK', label: 'Peak Tension', effect: "The tightest moment. Often the quietest. Don't add music here.", insert: 'peak tension, maximum pressure' },
      { name: 'RELAX', label: 'Release / Relief', effect: 'The exhale. After sustained tension, the audience physically relaxes. This is its own kind of power.', insert: 'tension release, relief' },
    ],
  },
  'Genre feel?': {
    context: "Genre sets audience expectations. You can fulfill them, subvert them, or transcend them — but know what they are.",
    options: [
      { name: 'DRAMA', label: 'Drama', effect: 'Internal conflict externalized. Quiet stakes. Performance carries the film.', insert: 'dramatic, character-driven' },
      { name: 'THRILL', label: 'Thriller', effect: 'External danger and information asymmetry. What the audience knows vs. what the character knows.', insert: 'thriller, suspenseful' },
      { name: 'HORROR', label: 'Horror', effect: 'The audience fears for the character — and then fears for themselves.', insert: 'horror, dread-driven' },
      { name: 'ACTION', label: 'Action', effect: 'Kinetic, visceral, spatial clarity. The audience needs to understand the geography of conflict.', insert: 'action, kinetic energy' },
      { name: 'ARTHO', label: 'Art House', effect: 'Formal, patient, willing to be ambiguous. The audience is asked to do interpretive work.', insert: 'art house, formal and contemplative' },
      { name: 'DOC', label: 'Documentary Feel', effect: 'Observational, unpolished, present. Handheld, natural light, real spaces.', insert: 'documentary aesthetic, observational' },
    ],
  },
  'Reference films?': {
    context: "A film reference anchors the AI to a specific visual language. Be specific — name the director, film, or scene.",
    options: [
      { name: 'KUB', label: 'Kubrick', effect: 'Symmetry, one-point perspective, slow zoom, cold precision. Control and dread.', insert: 'Stanley Kubrick visual style, symmetrical and cold' },
      { name: 'VILLR', label: 'Villeneuve', effect: 'Epic scale, hushed intimacy, Roger Deakins palette — vast and personal at once.', insert: 'Denis Villeneuve style, Deakins-lit, vast and intimate' },
      { name: 'WONK', label: 'Wes Anderson', effect: 'Centered framing, pastel palette, flat composition. Melancholy disguised as whimsy.', insert: 'Wes Anderson aesthetic, centered pastel symmetry' },
      { name: 'FINCH', label: 'Fincher', effect: 'Digital precision, desaturated cool tones, methodical camera movement. Controlled menace.', insert: 'David Fincher style, cold and precise' },
      { name: 'WONG', label: 'Wong Kar-wai', effect: 'Step-printing, neon blur, saturated colors, emotional fragmentation. Memory and longing.', insert: 'Wong Kar-wai aesthetic, saturated neon, motion blur' },
    ],
  },
  // ── COLOR ──
  'Palette / scheme?': {
    context: 'Color is emotion before thought. An audience responds to palette before they understand what they are seeing.',
    options: [
      { name: 'MONO', label: 'Monochromatic', effect: 'One hue in different saturations. Harmonious and focused — slightly surreal and stylized.', insert: 'monochromatic palette, single hue family' },
      { name: 'COMP', label: 'Complementary', effect: 'Opposite colors. High visual tension and energy. Teal and Orange is the Hollywood version of this.', insert: 'complementary colors, high contrast palette' },
      { name: 'ANAL', label: 'Analogous', effect: 'Neighboring colors. Harmonious and organic — feels natural and cohesive.', insert: 'analogous palette, neighboring hues' },
      { name: 'NEUT', label: 'Neutral + Accent', effect: 'A grey or beige world with one deliberate color. That color carries all the emotional weight.', insert: 'neutral palette with single color accent' },
      { name: 'DESAT', label: 'Desaturated', effect: 'Color drained from the world. Emotional distance, exhaustion, or the feeling of aftermath.', insert: 'desaturated, near-monochrome palette' },
    ],
  },
  'Dominant hues?': {
    context: "Name 1-3 colors that should dominate the frame. This anchors the grade before it starts.",
    options: [
      { name: 'AMBER', label: 'Amber / Gold', effect: 'Warmth, nostalgia, late light, intimacy. The most emotionally welcoming color.', insert: 'amber and gold dominant tones' },
      { name: 'TEAL', label: 'Teal / Cyan', effect: 'Cool, clinical, modern, or ominous. Pairs with orange to create cinematic contrast.', insert: 'teal and cyan dominant' },
      { name: 'CREAM', label: 'Cream / Ivory', effect: 'Soft, nostalgic, period-appropriate. Strips the modern harshness from the image.', insert: 'cream and ivory palette' },
      { name: 'SLATE', label: 'Slate / Steel Blue', effect: 'Cold, distant, melancholic. The color of rain, concrete, and things left behind.', insert: 'slate and steel blue tones' },
      { name: 'GREEN', label: 'Sickly Green', effect: 'Unease, surveillance, or the feeling of being under fluorescent light. Something is wrong here.', insert: 'sickly green undertones' },
    ],
  },
  'Contrast level?': {
    context: 'Contrast shapes how the audience reads depth and emotion in a frame.',
    options: [
      { name: 'LOW', label: 'Low Contrast / Milky', effect: 'Flat, airy, modern. Feels like a lifted shadow, a recent Instagram aesthetic. Soft and non-threatening.', insert: 'low contrast, lifted blacks, milky tones' },
      { name: 'MED', label: 'Medium / Natural', effect: 'Honest and balanced. The audience reads depth naturally without drama.', insert: 'medium natural contrast' },
      { name: 'HIGH', label: 'High Contrast', effect: 'Bold graphic shapes. Shadows are deep, highlights are hot. Dramatic and theatrical.', insert: 'high contrast, deep blacks and bright highlights' },
      { name: 'CRUSH', label: 'Crushed Blacks', effect: 'Blacks clipped to pure black. Everything in shadow disappears. Noir and menace.', insert: 'crushed blacks, clipped shadows' },
    ],
  },
  'Grade reference?': {
    context: "A DP or film reference locks in the grade direction instantly. Be as specific as possible.",
    options: [
      { name: 'DEAKINS', label: 'Roger Deakins', effect: 'Clean, precise, often cool with warm practicals. No Country, Blade Runner 2049, 1917.', insert: 'Roger Deakins palette, clean and precise' },
      { name: 'LUBEZKI', label: 'Emmanuel Lubezki', effect: 'Natural light pushed to its limits. The Revenant, Children of Men — present and alive.', insert: 'Emmanuel Lubezki natural light aesthetic' },
      { name: 'STORARO', label: 'Vittorio Storaro', effect: 'Warm reds and ambers, deliberate color symbolism. Apocalypse Now, The Last Emperor.', insert: 'Vittorio Storaro warm color symbolism' },
      { name: 'HOYTE', label: 'Hoyte van Hoytema', effect: "Film grain, IMAX scale, Nolan's worlds. Interstellar, Dunkirk — tactile and vast.", insert: 'Hoyte van Hoytema film aesthetic, Nolan-esque' },
    ],
  },
  // ── LENS ──
  'Focal length?': {
    context: "Focal length determines how the space between objects feels — expansion vs. compression.",
    options: [
      { name: '14-24', label: 'Ultra-Wide 14-24mm', effect: 'Expands space, exaggerates depth. Can distort. Creates anxiety, scale, or immersion in environment.', insert: 'ultra-wide lens, 14-24mm' },
      { name: '35MM', label: 'Wide 35mm', effect: 'Close to human peripheral vision. Documentary and observational. Feels present and immediate.', insert: '35mm lens' },
      { name: '50MM', label: 'Normal 50mm', effect: 'Closest to natural human vision. Honest, direct, unmanipulative. The purist choice.', insert: '50mm lens, natural perspective' },
      { name: '85MM', label: 'Portrait 85mm', effect: 'Slight compression. Flattering and isolating. The classic portrait and close-up lens.', insert: '85mm portrait lens' },
      { name: 'TELE', label: 'Telephoto 135-200mm', effect: 'Compresses space — layers flatten together. Surveillance feel. Subject is watched, not engaged.', insert: 'telephoto lens, 135-200mm' },
    ],
  },
  'Aperture / DOF?': {
    context: "Depth of field determines what the audience is allowed to see clearly — and what stays hidden.",
    options: [
      { name: 'WIDE', label: 'f/1.2–f/2 Shallow', effect: 'Subject in sharp focus, everything else dissolves. Total isolation. The background disappears.', insert: 'very shallow DOF, f/1.4-2, creamy bokeh' },
      { name: 'MED', label: 'f/2.8–f/5.6 Moderate', effect: 'Subject clear, background soft but readable. Subject and world coexist.', insert: 'moderate DOF, f/2.8-5.6' },
      { name: 'DEEP', label: 'f/8+ Deep Focus', effect: 'Everything sharp front to back. Orson Welles used this — the audience can read the entire frame.', insert: 'deep focus, f/8+, everything sharp throughout' },
    ],
  },
  'Distortion?': {
    context: "Lens distortion shapes how the audience perceives space — expanded, compressed, or surreal.",
    options: [
      { name: 'NONE', label: 'None / Rectilinear', effect: 'Straight lines stay straight. The world appears as it is.', insert: 'no distortion, rectilinear perspective' },
      { name: 'BARREL', label: 'Barrel / Fisheye', effect: 'Lines bow outward. Immersive and slightly surreal — the whole environment visible at once.', insert: 'barrel distortion, wide fisheye' },
      { name: 'ANAM', label: 'Anamorphic Squeeze', effect: 'The cinematic widescreen look. Oval bokeh, horizontal flares, slight horizontal stretch.', insert: 'anamorphic lens, 2x squeeze, oval bokeh' },
      { name: 'TILT', label: 'Tilt-Shift', effect: 'Selective focus plane — makes reality look like a miniature. Unusual and dreamlike.', insert: 'tilt-shift lens, selective focus plane' },
    ],
  },
  'Filter / diffusion?': {
    context: "Filters are the last physical layer before the sensor — they shape light before it becomes image.",
    options: [
      { name: 'NONE', label: 'No Filter', effect: 'Raw, unmodified. Clean and honest. The image without an opinion.', insert: 'no filter, clean glass' },
      { name: 'MIST', label: 'Black Mist / Pro-Mist', effect: 'Bloom on highlights, halation around lights, slight glow. Makes digital feel like film.', insert: 'black mist diffusion, highlight bloom' },
      { name: 'ND', label: 'Neutral Density', effect: 'Reduces light without affecting color. Enables wide aperture in bright conditions — shallow DOF outdoors.', insert: 'ND filter, wide aperture in bright light' },
      { name: 'POLAR', label: 'Polarizer', effect: 'Cuts reflections, deepens sky contrast, saturates colors. Outdoor cinematography staple.', insert: 'polarizing filter, cut reflections' },
    ],
  },
};

// ── Edit Prompt Director Guides ──────────────────────────────────────────────

export const EDIT_DIRECTOR_GUIDES: Record<string, DirectorGuide> = {
  // Subject
  'Age, build & ethnicity?': {
    context: 'Physical specificity anchors the AI to a real person, not a generic figure.',
    options: [
      { name: 'YOUNG', label: 'Late teens / 20s', effect: 'Youth, vulnerability, potential. Skin texture smooth, energy high.', insert: 'late 20s, youthful, smooth skin' },
      { name: 'MID', label: '30s / 40s', effect: 'Experience and authority. Lines beginning to form. Peak presence.', insert: 'mid 30s to 40s, experienced look' },
      { name: 'OLDER', label: '50s / 60s+', effect: 'History visible in the face. Weight and gravity. Earned character.', insert: 'late 50s, weathered, character lines' },
      { name: 'ATHL', label: 'Athletic Build', effect: 'Physical capability, discipline. Clothes sit differently — posture is confident.', insert: 'athletic build, defined physique' },
      { name: 'SLIM', label: 'Slim / Lean', effect: 'Grace and lightness. Can read as fragile or effortless depending on context.', insert: 'slim, lean build' },
    ],
  },
  'Face: eyes, jawline, expression?': {
    context: 'The face is the primary emotional surface. Describe it precisely.',
    options: [
      { name: 'SHARP', label: 'Sharp Jawline', effect: 'Defined, angular, authoritative. Reads as determined or intense.', insert: 'sharp defined jawline, angular features' },
      { name: 'SOFT', label: 'Soft Features', effect: 'Approachable, warm, open. Easier to empathize with.', insert: 'soft features, rounded jawline' },
      { name: 'INTNS', label: 'Intense Eyes', effect: 'Deep set or striking — the eyes carry the shot. Everything else supports them.', insert: 'intense, deep-set eyes' },
      { name: 'NEUT', label: 'Neutral Expression', effect: 'A blank canvas the audience interprets through context.', insert: 'neutral expression, resting face' },
      { name: 'WARN', label: 'Warm / Smiling', effect: 'Inviting and open. Lowers the audience\'s guard.', insert: 'warm expression, slight smile' },
    ],
  },
  'Hair: color, style, length?': {
    context: 'Hair style signals era, personality, and attention (or lack of it) to self-presentation.',
    options: [
      { name: 'MESSY', label: 'Disheveled / Messy', effect: 'Authentic, lived-in, not performing for the camera.', insert: 'disheveled hair, naturally messy' },
      { name: 'NEAT', label: 'Neat / Styled', effect: 'Controlled, deliberate, presenting a version of themselves.', insert: 'neatly styled hair, groomed' },
      { name: 'SHORT', label: 'Short / Close-Cropped', effect: 'Clean, unadorned, functional. Often signals military, institutional, or minimalist personality.', insert: 'short close-cropped hair' },
      { name: 'LONG', label: 'Long / Flowing', effect: 'Romantic, free, or untamed depending on state. Long hair in motion is cinematic.', insert: 'long flowing hair' },
    ],
  },
  'Clothing: fabric, fit, details?': {
    context: "Clothing tells the audience who this person is before they speak.",
    options: [
      { name: 'WORN', label: 'Worn / Distressed', effect: 'Life has happened to this person. History and authenticity in every crease.', insert: 'worn, distressed clothing, lived-in' },
      { name: 'SHARP', label: 'Sharp / Tailored', effect: 'Control and ambition — or armor. The person who dresses perfectly may be hiding something.', insert: 'sharp tailored suit, pressed and fitted' },
      { name: 'CASUAL', label: 'Casual / Everyday', effect: 'Off-guard and real. The person beneath the performance.', insert: 'casual everyday clothing, relaxed fit' },
      { name: 'LAYERS', label: 'Layered / Textured', effect: 'Visual complexity that rewards close attention. Depth and individuality.', insert: 'layered clothing, textured fabrics' },
    ],
  },
  // Action
  'What is the subject doing?': {
    context: "Action reveals character. How someone does something tells us who they are.",
    options: [
      { name: 'STILL', label: 'Completely Still', effect: 'Concentrated, waiting, contained. Stillness is active — something is being held.', insert: 'completely still, no movement' },
      { name: 'MOVE', label: 'Walking / Moving', effect: 'Purposeful or drifting — the quality of movement reveals intent.', insert: 'in motion, walking or moving' },
      { name: 'INTER', label: 'Interacting with Object', effect: 'The prop becomes part of the emotional story. What they touch and how they touch it.', insert: 'interacting with an object, hands occupied' },
      { name: 'LOOK', label: 'Looking / Observing', effect: 'The act of seeing is an act of desire or fear. What they look at and how they look at it.', insert: 'looking, observing something out of frame' },
    ],
  },
  'Body posture & weight?': {
    context: "The body holds the emotion the face tries to control.",
    options: [
      { name: 'OPEN', label: 'Open / Relaxed', effect: 'At ease, receptive, present. The body is not defending itself.', insert: 'open relaxed posture, weight settled' },
      { name: 'TENSE', label: 'Tense / Coiled', effect: 'Ready, anxious, or angry. The body is prepared for something.', insert: 'tense, coiled posture, weight forward' },
      { name: 'HUNCH', label: 'Hunched / Closed', effect: 'Protecting something — grief, shame, cold. Withdrawal made visible.', insert: 'hunched, closed off, weight inward' },
      { name: 'LEAN', label: 'Leaning / Off-Balance', effect: 'Caught between two states. Transition and uncertainty.', insert: 'leaning, slightly off-balance' },
    ],
  },
  'Facial expression & gaze?': {
    context: "The gaze direction tells the audience what the character wants or fears.",
    options: [
      { name: 'CAM', label: 'Direct to Camera', effect: 'Confrontational and intimate. The subject sees the audience. Uncomfortable and powerful.', insert: 'looking directly into camera' },
      { name: 'AWAY', label: 'Looking Away', effect: 'Longing, avoidance, or contemplation. What they look toward tells the story.', insert: 'gaze averted, looking away' },
      { name: 'DOWN', label: 'Looking Down', effect: 'Shame, sorrow, or thought. Inward focus.', insert: 'looking down, downcast gaze' },
      { name: 'DISTANT', label: 'Distant / Unfocused', effect: 'Somewhere else. Memory, trauma, or dissociation.', insert: 'distant unfocused gaze, thousand-yard stare' },
    ],
  },
  'Props being held or used?': {
    context: "A prop in a character's hands becomes an extension of their emotional state.",
    options: [
      { name: 'PHONE', label: 'Phone / Screen', effect: 'Modern isolation or connection. The phone as portal to another world.', insert: 'holding phone, screen light on face' },
      { name: 'DRINK', label: 'Drink / Cup', effect: 'Comfort, ritual, or social lubricant. Something to hold when nothing else feels steady.', insert: 'holding a drink, cup or glass' },
      { name: 'PAPER', label: 'Document / Letter', effect: 'Information being received or delivered. Stakes are on the page.', insert: 'holding paper, letter or document' },
      { name: 'EMPTY', label: 'Empty Hands', effect: 'Vulnerability or readiness. Nothing to hide behind.', insert: 'empty hands, nothing held' },
    ],
  },
  // Environment
  'Location: indoor or outdoor?': {
    context: "Interior or exterior is an immediate emotional context — contained or exposed.",
    options: [
      { name: 'INT', label: 'Interior — Home', effect: 'Domestic, intimate, private. The character in their natural habitat.', insert: 'interior, domestic home setting' },
      { name: 'CAFE', label: 'Interior — Café / Bar', effect: 'Social, transitional. Between-worlds energy — neither home nor work.', insert: 'interior, café or bar setting' },
      { name: 'OFFICE', label: 'Interior — Office', effect: 'Institutional, hierarchical. The person within a system.', insert: 'interior, office or professional space' },
      { name: 'STREET', label: 'Exterior — Street', effect: 'Exposed, anonymous, moving through the world. Urban texture and indifference.', insert: 'exterior, urban street' },
      { name: 'NATURE', label: 'Exterior — Nature', effect: 'Scale and impermanence. The human figure against something much larger.', insert: 'exterior, natural landscape' },
    ],
  },
  'Time of day & natural light?': {
    context: "Natural light quality is determined by time of day. It is the most emotional production design decision.",
    options: [
      { name: 'GOLD', label: 'Golden Hour', effect: 'Warm, fragile, transient. The most beautiful and emotionally legible light.', insert: 'golden hour light, warm and low angle' },
      { name: 'DAY', label: 'Midday Harsh', effect: 'Exposed and unforgiving. Shadowless light hides nothing.', insert: 'harsh midday sun, flat and bright' },
      { name: 'WIN', label: 'Window Light', effect: 'Directional, soft, specific. The most cinematic indoor light source.', insert: 'soft window light, side directional' },
      { name: 'NIGHT', label: 'Night / Artificial', effect: 'Defined by chosen sources. What is lit and what stays dark is the story.', insert: 'night, artificial practical light sources' },
    ],
  },
  'Background details & props?': {
    context: "The background is not decoration — it's context. What surrounds the character tells their story.",
    options: [
      { name: 'EMPTY', label: 'Clean / Minimal', effect: 'All focus on the subject. Nothing competes. The character exists in a void of their own making.', insert: 'clean minimal background, no distractions' },
      { name: 'RICH', label: 'Detailed / Layered', effect: 'A world exists beyond the character. Depth and history in every corner.', insert: 'layered background, rich environmental detail' },
      { name: 'BLUR', label: 'Blurred / Bokeh', effect: 'Background exists but does not demand attention. Subject isolation with environmental context.', insert: 'blurred background, shallow depth of field' },
      { name: 'SYMM', label: 'Symmetric / Composed', effect: 'Deliberate, formal, controlled. The environment reflects the character\'s inner world.', insert: 'symmetrical composed background' },
    ],
  },
  'Atmosphere: warm, cold, busy?': {
    context: "Atmosphere is the overall sensory register of the environment.",
    options: [
      { name: 'COZY', label: 'Cozy / Intimate', effect: 'Safe, warm, private. The world outside doesn\'t reach here.', insert: 'cozy intimate atmosphere, warm and close' },
      { name: 'COLD', label: 'Cold / Clinical', effect: 'Distance, efficiency, or sterility. Warmth has been designed out.', insert: 'cold clinical atmosphere, minimal warmth' },
      { name: 'BUSY', label: 'Busy / Energetic', effect: 'Life happening everywhere. The character is one element in a larger motion.', insert: 'busy energetic atmosphere, movement and activity' },
      { name: 'STILL', label: 'Still / Contemplative', effect: 'The world paused. Thought and feeling have space to exist.', insert: 'still contemplative atmosphere, quiet and present' },
    ],
  },
  // Art Style
  'Photorealistic or stylized?': {
    context: "The level of realism determines how much the audience suspends disbelief.",
    options: [
      { name: 'HYPER', label: 'Hyperrealistic', effect: 'Indistinguishable from a photograph. Skin texture, pore detail, material weight.', insert: 'hyperrealistic, photographic detail' },
      { name: 'CINEM', label: 'Cinematic Real', effect: 'Realistic but with intentional color and light. The polished truth, not raw truth.', insert: 'cinematic realism, color graded and composed' },
      { name: 'PAINT', label: 'Painterly / Soft', effect: 'Impressionistic. The world as felt, not as seen. Edges softer, colors richer.', insert: 'painterly, soft impressionistic quality' },
      { name: 'STYLZ', label: 'Graphic / Stylized', effect: 'A clear visual aesthetic imposed. Style signals intent — the world is being interpreted, not recorded.', insert: 'stylized, strong graphic aesthetic' },
    ],
  },
  'Film or digital? Shot on what?': {
    context: "The camera system leaves its fingerprint on the image — grain, sharpness, dynamic range.",
    options: [
      { name: 'FILMSCAN', label: 'Film Scan', effect: 'Organic grain, rich blacks, slight halation around highlights. The texture of cinema history.', insert: 'film scan, grain and organic texture' },
      { name: 'DSLR', label: 'Digital SLR (Canon R5 / Sony A7)', effect: 'Clean, sharp, modern. The look of contemporary prestige television.', insert: 'digital DSLR, clean and sharp' },
      { name: 'IPHONE', label: 'iPhone / Mobile', effect: 'Authentic, UGC-adjacent, present. The look of now, unmediated.', insert: 'shot on iPhone, mobile aesthetic' },
      { name: 'POLARD', label: 'Polaroid / Instant', effect: 'Nostalgic, imprecise, emotional. Memory made physical.', insert: 'Polaroid instant photo aesthetic' },
    ],
  },
  'Editorial, cinematic, or UGC?': {
    context: "The register of the image signals its relationship to reality and to the audience.",
    options: [
      { name: 'EDIT', label: 'Editorial / Magazine', effect: 'Polished, posed, aspirational. The world at its most composed. Intentional in every detail.', insert: 'editorial, magazine quality, polished and posed' },
      { name: 'CINEM', label: 'Cinematic / Narrative', effect: 'A story is being told. Dramatic light, intentional framing, emotional weight.', insert: 'cinematic, narrative quality, dramatic lighting' },
      { name: 'UGC', label: 'UGC / Authentic', effect: 'Casual, handheld, present. The camera is not trying — which is its own kind of try.', insert: 'UGC aesthetic, authentic and unpolished' },
      { name: 'DOC', label: 'Documentary', effect: 'Observational. The camera witnesses without directing. Feels true even when composed.', insert: 'documentary style, observational and real' },
    ],
  },
  'Era, movement, or reference?': {
    context: "A visual era or reference gives the AI a complete aesthetic shorthand.",
    options: [
      { name: 'NOW', label: 'Contemporary', effect: 'Immediate and relatable. No period distance — the audience is in the same world.', insert: 'contemporary, present day aesthetic' },
      { name: '70S', label: '1970s Film', effect: 'Warm, grainy, personal. New Hollywood energy. Imperfect and alive.', insert: '1970s film aesthetic, warm grain' },
      { name: '90S', label: '1990s / 2000s', effect: 'Specific nostalgia. Digital but early, slightly desaturated, grunge-era texture.', insert: '1990s-2000s aesthetic' },
      { name: 'CYBER', label: 'Cyberpunk / Neon', effect: 'Neon-lit, rain-slicked, technological dystopia. Saturated and dark.', insert: 'cyberpunk aesthetic, neon and rain' },
    ],
  },
  // Lighting
  'Key light: direction & source?': {
    context: "Where the key light comes from defines shadow — and shadow is where drama lives.",
    options: [
      { name: 'FRONT', label: 'Front / Flat', effect: 'Even light, no shadow. Clinical and exposed. The subject has nowhere to hide.', insert: 'front-lit, flat fill lighting' },
      { name: 'REMBR', label: '45° Rembrandt', effect: 'The classic portrait light. Three-dimensional and human.', insert: '45° Rembrandt key light' },
      { name: 'SIDE', label: 'Side / Split', effect: "Half the face in shadow. Duality and concealment.", insert: 'side split lighting' },
      { name: 'BACK', label: 'Rim / Backlit', effect: 'Separation from background. Heroic or mysterious.', insert: 'rim lighting, backlit subject' },
    ],
  },
  'Hard (harsh) or soft (diffused)?': {
    context: "Hard or soft is a mood decision before it is a technical one.",
    options: [
      { name: 'HARD', label: 'Hard Light', effect: 'Direct, harsh, crisp shadows. Intense, dramatic, confrontational.', insert: 'hard light, sharp shadows' },
      { name: 'SOFT', label: 'Soft Light', effect: 'Diffused, gentle, no harsh edges. Intimate and warm.', insert: 'soft diffused light' },
      { name: 'MIX', label: 'Mixed', effect: 'Soft key with hard practical. Complexity and realism.', insert: 'mixed soft key and hard fill' },
    ],
  },
  'Warm, cool, or neutral tones?': {
    context: "Color temperature is emotional temperature.",
    options: [
      { name: 'WARM', label: 'Warm / Golden', effect: 'Home, intimacy, nostalgia. The most human light.', insert: 'warm golden tones, tungsten light' },
      { name: 'COOL', label: 'Cool / Blue', effect: 'Clinical, cold, distant. Warmth removed by design.', insert: 'cool blue tones, daylight or shade' },
      { name: 'NEUT', label: 'Neutral / Balanced', effect: 'Transparent and honest. The story sets the temperature.', insert: 'neutral balanced light, no temperature bias' },
      { name: 'MIX', label: 'Mixed Temps', effect: 'Multiple sources at different temperatures. Feels real and complex.', insert: 'mixed color temperatures' },
    ],
  },
  'Shadow depth: deep or lifted?': {
    context: "Shadow depth determines contrast and how much of the image the audience can read.",
    options: [
      { name: 'DEEP', label: 'Deep / Crushed', effect: 'High contrast, moody, noir. What stays in shadow is as important as what is lit.', insert: 'deep shadows, crushed blacks' },
      { name: 'LIFT', label: 'Lifted / Airy', effect: 'Low contrast, transparent, open. Soft and non-threatening.', insert: 'lifted shadows, low contrast, airy' },
      { name: 'MED', label: 'Medium / Natural', effect: 'Honest and balanced. The audience reads depth naturally.', insert: 'medium natural shadow depth' },
    ],
  },
  // Camera
  'Framing: ECU, CU, MCU, MS, WS?': {
    context: "Framing distance controls emotional intimacy between the subject and the audience.",
    options: [
      { name: 'ECU', label: 'Extreme Close-Up', effect: 'One detail fills the frame — eye, lips, hands. Total focus and intensity.', insert: 'extreme close-up, single detail fills frame' },
      { name: 'CU', label: 'Close-Up', effect: "The most emotionally connecting framing. The audience reads the face.", insert: 'close-up, face fills frame' },
      { name: 'MCU', label: 'Med. Close-Up', effect: 'Head and shoulders. Intimate but not claustrophobic. Dialogue standard.', insert: 'medium close-up, head and shoulders' },
      { name: 'MS', label: 'Medium Shot', effect: 'Waist up. Body language and face together.', insert: 'medium shot, waist up' },
      { name: 'WS', label: 'Wide Shot', effect: 'Full body in environment. Context and scale.', insert: 'wide shot, full body in environment' },
    ],
  },
  'Angle: eye level, low, high?': {
    context: "Angle is a power relationship between camera, subject, and audience.",
    options: [
      { name: 'EYE', label: 'Eye Level', effect: 'Neutral. Peer relationship. The most honest and relatable.', insert: 'eye level angle' },
      { name: 'LOW', label: 'Low Angle', effect: 'Subject powerful or heroic. Audience looks up.', insert: 'low angle, looking up at subject' },
      { name: 'HIGH', label: 'High Angle', effect: 'Subject vulnerable or observed. Audience holds power.', insert: 'high angle, looking down at subject' },
      { name: 'DUTCH', label: 'Dutch Tilt', effect: 'Off-kilter, unease, psychological instability.', insert: 'dutch tilt, canted angle' },
    ],
  },
  'Lens & focal length?': {
    context: "Focal length shapes how space feels — compressed or expansive.",
    options: [
      { name: '35MM', label: '35mm Wide', effect: 'Environmental, observational, present. Documentary intimacy.', insert: '35mm lens, wide and environmental' },
      { name: '50MM', label: '50mm Normal', effect: 'Natural human eye. Honest and unmanipulative.', insert: '50mm lens, natural perspective' },
      { name: '85MM', label: '85mm Portrait', effect: 'Flattering compression, subject isolation, creamy bokeh.', insert: '85mm portrait lens, soft background' },
      { name: 'TELE', label: 'Telephoto 135mm+', effect: 'Space compressed, subject watched from distance.', insert: 'telephoto lens, 135mm+, compressed space' },
    ],
  },
  'DOF: bokeh or sharp background?': {
    context: "Depth of field determines what the audience is allowed to see clearly.",
    options: [
      { name: 'BOKEH', label: 'Shallow / Bokeh', effect: 'Subject isolated, background dissolves. Total visual focus on one thing.', insert: 'shallow DOF, creamy bokeh, isolated subject' },
      { name: 'MED', label: 'Moderate', effect: 'Subject clear, background soft but readable. Subject and world coexist.', insert: 'moderate DOF, subject sharp, background soft' },
      { name: 'DEEP', label: 'Deep Focus', effect: 'Everything sharp. The audience can read the whole frame — foreground to background.', insert: 'deep focus, sharp throughout' },
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
