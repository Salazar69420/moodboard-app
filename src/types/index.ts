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

// ─── Shot Prompt Tooltip Definitions ─────────────────────────────────────────

export const SHOT_PROMPT_TOOLTIPS: Record<string, string> = {
  // Camera
  'Shot type?': 'ECU: Extreme Close-Up · CU: Close-Up · MCU: Med Close-Up · MS: Medium · MLS: Med Long · LS: Long Shot · ELS: Extreme Long',
  'Camera movement?': 'Static · Pan · Tilt · Dolly/Push · Pull-out · Truck (lateral) · Pedestal · Crane/Jib · Handheld · Steadicam · Whip pan',
  'Angle?': 'Eye level · Low angle (hero) · High angle (vulnerable) · Dutch tilt · Overhead/bird\'s eye · Worm\'s eye',
  'Framing?': 'Rule of thirds · Centered/symmetrical · Head room · Lead room · OTS (over-the-shoulder) · Two-shot · POV · Cutaway',
  // Subject
  'Who / what is in frame?': 'Main subject · Secondary figures · Props as focus · Environmental elements · Abstract/detail shot',
  'Pose / position?': 'Standing · Sitting · Crouching · Walking · Running · Facing cam · Profile (side) · Back to cam',
  'Expression?': 'Neutral · Happy · Sad · Angry · Fearful · Surprised · Determined · Contemplative · Pained · Stoic',
  'Wardrobe details?': 'Fabric type (denim/silk/leather) · Color · Fit (loose/fitted) · Layering · Key accessories · Footwear · Condition',
  // Action
  'What happens?': 'Physical action · Emotional reaction · Environmental event · Story reveal · Discovery · Transition moment',
  'Speed / pacing?': 'Real-time · Slow motion · Fast-motion/timelapse · Ramping (speed change) · Freeze frame',
  'Key beat?': 'Climax moment · Turning point · Quiet beat · Jump scare · Comic relief · Revelation · First look · Reunion',
  'Transition out?': 'Hard cut · Smash cut · Dissolve · Fade to black · Match cut · L-cut · J-cut · Wipe · Iris out',
  // Environment
  'Location / setting?': 'Urban · Suburban · Rural · Interior · Exterior · Abstract space · Studio · Natural landscape · Industrial',
  'Time of day?': 'Dawn/Golden hr · Morning · Midday/Harsh · Afternoon · Magic hour/Sunset · Dusk/Blue hr · Night',
  'Weather?': 'Clear sky · Overcast/Diffused · Rain · Fog/Mist · Snow · Storm · Heat haze · Dusty golden light',
  'Era / period?': 'Contemporary · 1970s · 1980s · 1990s · Y2K · Near future · Far future/Dystopian · Historical period',
  // Lighting
  'Key light direction?': 'Front (flat) · 45° Rembrandt · Side split · Back/rim · Top down · Under light (horror/dramatic)',
  'Quality (hard/soft)?': 'Hard: direct sun, spot → sharp crisp shadows · Soft: overcast, bounce, diffuser → gentle wrap',
  'Color temp?': 'Warm tungsten ~3200K · Neutral daylight ~5600K · Cool shade ~7000K · Mixed temps · Neon color pop',
  'Practicals in scene?': 'Practicals = visible light sources in frame: table lamp, TV screen, candle, window, neon sign',
  // Texture
  'Film look / grain?': 'Clean digital · Fine grain (ISO 400) · Heavy grain (3200+) · VHS noise · 8mm look · 16mm scan',
  'Lens character?': 'Clinical/sharp · Vintage glass (flare, aberration) · Anamorphic (oval bokeh, horizontal flare) · Dreamy soft',
  'Color grade style?': 'Natural · Desaturated/flat · High contrast · Teal & Orange · Bleach bypass · Cross process · Monochrome',
  'VFX / comp notes?': 'Practical in-camera · CGI composite · Particle FX · Lens flare · Light leaks · Matte painting',
  // Audio
  'Diegetic sounds?': 'Diegetic = from scene world: footsteps, rain drops, TV playing, traffic, crowd murmur, door slam',
  'Score / music style?': 'Orchestral · Synth/electronic · Jazz · Folk/acoustic · Ambient drone · Silence · Cite a track/artist',
  'Dialogue / VO?': 'On-screen dialogue · Voice-over narration · Internal monologue · ADR replacement · No spoken word',
  'Silence / ambient?': 'Dead silence · Room tone only · Natural ambient · Contrast (loud scene → sudden quiet for impact)',
  // Mood
  'Emotional tone?': 'Tense · Melancholic · Joyful · Eerie · Romantic · Hopeful · Desolate · Playful · Menacing · Serene',
  'Tension level?': 'Calm/peaceful · Subtle unease · Slow-building dread · Peak tension · Climax moment · Release/relief',
  'Genre feel?': 'Drama · Thriller · Horror · Comedy · Action · Sci-fi · Romance · Documentary · Art house · Western',
  'Reference films?': 'Cite director name, film title or specific scene to anchor visual and tonal reference for AI',
  // Color
  'Palette / scheme?': 'Monochromatic · Complementary (opposites) · Analogous (neighbors) · Triadic · Neutral + single accent',
  'Dominant hues?': 'Name 1-3 dominant colors in frame · Note warm vs cool temperature · Contrast between subject/BG',
  'Contrast level?': 'Low contrast (milky/flat) · Medium natural · High contrast · Crushed blacks + blown highlights',
  'Grade reference?': 'Cite a DP or film (e.g., "Roger Deakins, No Country palette" / "Blade Runner 2049 teal-orange")',
  // Lens
  'Focal length?': 'Ultra-wide 14-24mm · Wide 24-35mm · Normal 40-55mm · Portrait 70-85mm · Tele 100-200mm · Super 300mm+',
  'Aperture / DOF?': 'f/1.2–2.8: very shallow + creamy bokeh · f/4–8: moderate · f/11+: deep sharp (landscape/architecture)',
  'Distortion?': 'Barrel/fisheye · Pincushion · Perspective stretch · Anamorphic 2× squeeze · Tilt-shift focus plane',
  'Filter / diffusion?': 'ND (neutral density) · Polarizer · Pro-Mist/Black Mist (glow bloom) · Streak filter · Star burst',
};

// ─── Edit Prompt Tooltip Definitions ─────────────────────────────────────────

export const EDIT_PROMPT_TOOLTIPS: Record<string, string> = {
  // Subject
  'Age, build & ethnicity?': 'Approximate age range · Body type (slim, athletic, curvy, average) · Skin tone & ethnicity if relevant to visual accuracy',
  'Face: eyes, jawline, expression?': 'Eye color & shape · Jawline (sharp, soft, round) · Resting expression (neutral, warm, stern, playful)',
  'Hair: color, style, length?': 'Natural or dyed color · Straight, wavy, curly, coily · Short, medium, long · Up, down, braided, messy',
  'Clothing: fabric, fit, details?': 'Material (cotton, silk, denim, leather) · Fit (oversized, fitted, tailored) · Notable details (buttons, zips, logos, patterns)',
  // Action
  'What is the subject doing?': 'Primary activity: sitting, walking, cooking, reading, dancing · Interaction with props or environment',
  'Body posture & weight?': 'Leaning, upright, slouched · Weight on one leg, crossed legs · Relaxed, tense, dynamic',
  'Facial expression & gaze?': 'Smiling, laughing, focused, pensive · Looking at camera, away, down · Eyes open, squinting, closed',
  'Props being held or used?': 'Phone, book, cup, tool, instrument · How it\'s held (one hand, both, cradled) · Interaction style (casual, deliberate)',
  // Environment
  'Location: indoor or outdoor?': 'Indoor: studio, home, office, café · Outdoor: street, park, beach, rooftop · Mixed: balcony, porch, greenhouse',
  'Time of day & natural light?': 'Morning golden · Midday harsh · Afternoon warm · Blue hour · Night artificial · Window light direction',
  'Background details & props?': 'Furniture, plants, artwork · Architectural elements · Depth & layers (foreground, mid, background)',
  'Atmosphere: warm, cold, busy?': 'Cozy & intimate · Cool & clinical · Bustling & energetic · Quiet & contemplative · Moody & dramatic',
  // Art Style
  'Photorealistic or stylized?': 'Hyperrealistic photo · Soft painterly · Illustration · 3D render · Collage · Mixed media',
  'Film or digital? Shot on what?': 'Digital: Canon R5, Sony A7 · Film: Portra 400, Kodak Gold · Phone: iPhone, Pixel · Instant: Polaroid, Fuji Instax',
  'Editorial, cinematic, or UGC?': 'Editorial: polished, posed, magazine · Cinematic: narrative, dramatic, widescreen · UGC: casual, authentic, handheld',
  'Era, movement, or reference?': 'Y2K aesthetic · 70s film grain · Minimalist Scandi · Art Nouveau · Cyberpunk · Cottagecore · Reference artist or photographer',
  // Lighting
  'Key light: direction & source?': 'Front (flat fill) · Side (Rembrandt, split) · Back (rim, silhouette) · Top (butterfly) · Under (dramatic, horror)',
  'Hard (harsh) or soft (diffused)?': 'Hard: direct sun, bare flash → sharp shadows · Soft: overcast, softbox, bounce → gentle gradients',
  'Warm, cool, or neutral tones?': 'Warm: golden, tungsten ~3200K · Cool: shade, fluorescent ~6500K+ · Neutral: balanced daylight ~5500K · Mixed',
  'Shadow depth: deep or lifted?': 'Deep shadows: high contrast, moody · Lifted shadows: flat, airy, low contrast · Mixed: selective shadow fill',
  // Camera
  'Framing: ECU, CU, MCU, MS, WS?': 'ECU: extreme close-up (eyes, lips) · CU: face · MCU: head & shoulders · MS: waist up · WS: full body + environment',
  'Angle: eye level, low, high?': 'Eye level: neutral, relatable · Low angle: powerful, heroic · High angle: vulnerable, small · Dutch: uneasy, dynamic',
  'Lens & focal length?': '24mm wide: environmental · 35mm: editorial standard · 50mm: natural eye · 85mm: portrait · 135mm+: compressed, intimate',
  'DOF: bokeh or sharp background?': 'f/1.4–2.8: creamy bokeh, subject isolation · f/4–5.6: moderate separation · f/8–16: sharp throughout, environmental',
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
