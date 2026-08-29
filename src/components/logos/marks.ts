/**
 * Every mark the strip cycles through, with its own optical height.
 *
 * Generated. The list is deliberate rather than a directory dump, and each
 * entry's licence and source are recorded in docs/LOGOS.md.
 */
import type { ComponentType } from "react";

import { AirtableMark } from "./AirtableMark";
import { AnthropicMark } from "./AnthropicMark";
import { AntigravityMark } from "./AntigravityMark";
import { AsanaMark } from "./AsanaMark";
import { AwsMark } from "./AwsMark";
import { AzureMark } from "./AzureMark";
import { CalComMark } from "./CalComMark";
import { CanvaMark } from "./CanvaMark";
import { CartesiaMark } from "./CartesiaMark";
import { ClickUpMark } from "./ClickUpMark";
import { CloudflareMark } from "./CloudflareMark";
import { DiscordMark } from "./DiscordMark";
import { DockerMark } from "./DockerMark";
import { DropboxMark } from "./DropboxMark";
import { ElevenLabsMark } from "./ElevenLabsMark";
import { FirebaseMark } from "./FirebaseMark";
import { FlyMark } from "./FlyMark";
import { GeminiMark } from "./GeminiMark";
import { GitHubMark } from "./GitHubMark";
import { GitLabMark } from "./GitLabMark";
import { GmailMark } from "./GmailMark";
import { GoogleCalendarMark } from "./GoogleCalendarMark";
import { GoogleCloudMark } from "./GoogleCloudMark";
import { GoogleDriveMark } from "./GoogleDriveMark";
import { GoogleMark } from "./GoogleMark";
import { GroqMark } from "./GroqMark";
import { HerokuMark } from "./HerokuMark";
import { HomeAssistantMark } from "./HomeAssistantMark";
import { KubernetesMark } from "./KubernetesMark";
import { LinearMark } from "./LinearMark";
import { NeonMark } from "./NeonMark";
import { NetlifyMark } from "./NetlifyMark";
import { NotionMark } from "./NotionMark";
import { NvidiaMark } from "./NvidiaMark";
import { OllamaMark } from "./OllamaMark";
import { OpenAiMark } from "./OpenAiMark";
import { OpenRouterMark } from "./OpenRouterMark";
import { PlanetScaleMark } from "./PlanetScaleMark";
import { RailwayMark } from "./RailwayMark";
import { RenderMark } from "./RenderMark";
import { SlackMark } from "./SlackMark";
import { SpotifyMark } from "./SpotifyMark";
import { StripeMark } from "./StripeMark";
import { SupabaseMark } from "./SupabaseMark";
import { TelegramMark } from "./TelegramMark";
import { TodoistMark } from "./TodoistMark";
import { TwilioMark } from "./TwilioMark";
import { VercelMark } from "./VercelMark";
import { XaiMark } from "./XaiMark";
import { YouTubeMusicMark } from "./YouTubeMusicMark";

export interface Mark {
  /** Brand name, read out to screen readers. */
  name: string;
  Mark: ComponentType<{ className?: string }>;
  /** Optical height in rem — see docs/LOGOS.md. */
  rem: number;
}

export const marks: Mark[] = [
  { name: "Airtable", Mark: AirtableMark, rem: 2.85 },
  { name: "Anthropic Claude", Mark: AnthropicMark, rem: 2.55 },
  { name: "Antigravity", Mark: AntigravityMark, rem: 2.7 },
  { name: "Asana", Mark: AsanaMark, rem: 2.5 },
  { name: "AWS", Mark: AwsMark, rem: 3.15 },
  { name: "Microsoft Azure", Mark: AzureMark, rem: 2.25 },
  { name: "Cal.com", Mark: CalComMark, rem: 3.4 },
  { name: "Canva", Mark: CanvaMark, rem: 2.75 },
  { name: "Cartesia", Mark: CartesiaMark, rem: 2.4 },
  { name: "ClickUp", Mark: ClickUpMark, rem: 2.75 },
  { name: "Cloudflare", Mark: CloudflareMark, rem: 2.9 },
  { name: "Discord", Mark: DiscordMark, rem: 2.35 },
  { name: "Docker", Mark: DockerMark, rem: 2.65 },
  { name: "Dropbox", Mark: DropboxMark, rem: 2.55 },
  { name: "ElevenLabs", Mark: ElevenLabsMark, rem: 2.55 },
  { name: "Firebase", Mark: FirebaseMark, rem: 2.4 },
  { name: "Fly.io", Mark: FlyMark, rem: 2.15 },
  { name: "Google Gemini", Mark: GeminiMark, rem: 2.85 },
  { name: "GitHub", Mark: GitHubMark, rem: 2.5 },
  { name: "GitLab", Mark: GitLabMark, rem: 2.3 },
  { name: "Gmail", Mark: GmailMark, rem: 2.45 },
  { name: "Google Calendar", Mark: GoogleCalendarMark, rem: 2.0 },
  { name: "Google Cloud", Mark: GoogleCloudMark, rem: 2.5 },
  { name: "Google Drive", Mark: GoogleDriveMark, rem: 2.3 },
  { name: "Google Workspace", Mark: GoogleMark, rem: 2.4 },
  { name: "Groq", Mark: GroqMark, rem: 3.1 },
  { name: "Heroku", Mark: HerokuMark, rem: 2.75 },
  { name: "Home Assistant", Mark: HomeAssistantMark, rem: 2.25 },
  { name: "Kubernetes", Mark: KubernetesMark, rem: 2.3 },
  { name: "Linear", Mark: LinearMark, rem: 2.25 },
  { name: "Neon", Mark: NeonMark, rem: 2.95 },
  { name: "Netlify", Mark: NetlifyMark, rem: 3.4 },
  { name: "Notion", Mark: NotionMark, rem: 2.4 },
  { name: "NVIDIA", Mark: NvidiaMark, rem: 2.7 },
  { name: "Ollama", Mark: OllamaMark, rem: 3.2 },
  { name: "OpenAI", Mark: OpenAiMark, rem: 2.6 },
  { name: "OpenRouter", Mark: OpenRouterMark, rem: 2.45 },
  { name: "PlanetScale", Mark: PlanetScaleMark, rem: 2.3 },
  { name: "Railway", Mark: RailwayMark, rem: 2.25 },
  { name: "Render", Mark: RenderMark, rem: 2.45 },
  { name: "Slack", Mark: SlackMark, rem: 2.4 },
  { name: "Spotify", Mark: SpotifyMark, rem: 2.2 },
  { name: "Stripe", Mark: StripeMark, rem: 2.45 },
  { name: "Supabase", Mark: SupabaseMark, rem: 2.6 },
  { name: "Telegram", Mark: TelegramMark, rem: 2.2 },
  { name: "Todoist", Mark: TodoistMark, rem: 2.05 },
  { name: "Twilio", Mark: TwilioMark, rem: 2.4 },
  { name: "Vercel", Mark: VercelMark, rem: 2.5 },
  { name: "xAI Grok", Mark: XaiMark, rem: 3.05 },
  { name: "YouTube Music", Mark: YouTubeMusicMark, rem: 2.6 },
];
