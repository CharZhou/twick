/**
 * Toolbar Component
 * 
 * A vertical toolbar that provides quick access to different editing tools
 * and media types. Displays icons with labels and optional keyboard shortcuts.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.selectedTool - Currently selected tool ID
 * @param {(tool: string) => void} props.setSelectedTool - Callback to update selected tool
 * 
 * @example
 * ```tsx
 * <Toolbar
 *   selectedTool="text"
 *   setSelectedTool={(tool) => console.log(`Selected ${tool}`)}
 * />
 * ```
 */

import { 
  Type, 
  Upload, 
  Video,
  Image, 
  Music,
  Circle,
  MessageSquare,
  Plus,
  Square,
  Wand2,
  File,
  UserRound,
} from 'lucide-react'
import type { ToolCategory } from '../types'
import { useTwickI18n } from "@twick/video-editor";

const defaultToolCategories: ToolCategory[] = [
  // { id: 'templates', name: 'Templates', icon: 'Plus', description: 'Start from a project template' },
  // { id: 'record', name: 'Record', icon: 'Upload', description: 'Record screen and import clip' },
  { id: 'video', name: 'Video', icon: 'Video', description: 'Add a video element' },
  { id: 'image', name: 'Image', icon: 'Image', description: 'Add an image element' },
  { id: 'audio', name: 'Audio', icon: 'Audio', description: 'Add an audio element' },
  { id: 'text', name: 'Text', icon: 'Type', description: 'Add text elements' },
  { id: 'text-style', name: 'Text Style', icon: 'Type', description: 'Apply text style presets' },
  { id: 'effect', name: 'Effect', icon: 'Wand2', description: 'Apply GL video effects' },
  { id: 'shape', name: 'Shape', icon: 'Square', description: 'Add lines, arrows, boxes, and circles' },
  // { id: 'chapters', name: 'Chapters', icon: 'File', description: 'Manage chapter markers' },
  // { id: 'script', name: 'Script', icon: 'Type', description: 'Build timeline from a script outline' },
  { id: 'caption', name: 'Caption', icon: 'MessageSquare', description: 'Manage captions'},
  { id: 'generate-media', name: 'Generate', icon: 'Wand2', description: 'Generate image or video with AI'},
  { id: 'digital-human', name: 'Avatar', icon: 'UserRound', description: 'Create avatar videos' },
]

const toolLabelKeyById = {
  video: "toolbar.video",
  image: "toolbar.image",
  audio: "toolbar.audio",
  text: "toolbar.text",
  "text-style": "toolbar.textStyle",
  effect: "toolbar.effect",
  shape: "toolbar.shape",
  caption: "toolbar.caption",
  "generate-media": "toolbar.generate",
  "digital-human": "toolbar.digitalHuman",
} as const;

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Plus': return Plus
    case 'Type': return Type
    case 'Upload': return Upload
    case 'Square': return Square
    case 'Image': return Image
    case 'Video': return Video
    case 'Audio': return Music
    case 'Circle': return Circle
    case 'Rect': return Square
    case 'MessageSquare': return MessageSquare
    case 'Wand2': return Wand2
    case 'File': return File
    case 'UserRound': return UserRound
    default: return Plus
  }
}

export function Toolbar({
  selectedTool,
  setSelectedTool,
  customTools = [],
  hiddenTools = [],
}: {
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  customTools?: ToolCategory[];
  hiddenTools?: string[];
}) {
  const { t } = useTwickI18n();

  const mergedTools = [...defaultToolCategories, ...customTools].filter(
    (tool) => !hiddenTools.includes(tool.id)
  );
  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId)
  }

  return (
    <div className="sidebar">
      {/* Main Tools */}
      {mergedTools.map((tool) => {
        const Icon = getIcon(tool.icon)
        const isSelected = selectedTool === tool.id
        const localizedName =
          tool.id in toolLabelKeyById
            ? t(toolLabelKeyById[tool.id as keyof typeof toolLabelKeyById])
            : tool.name;
        const tooltipText = `${localizedName}${tool.shortcut ? ` (${tool.shortcut})` : ''}`;
        return (
          <div
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            className={`toolbar-btn ${isSelected ? 'active' : ''}`}
            title={tooltipText}
            data-tooltip={tooltipText}
          >
            <Icon className="icon-sm" />
            <span className="toolbar-label">
              {localizedName}
            </span>
          </div>
        )
      })}
    </div>
  )
}
