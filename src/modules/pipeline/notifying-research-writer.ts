import {
  eventsFromPublishedStories,
  type ResearchLiveBus,
} from "@/modules/dashboard/research-live";
import type {
  PipelineResearchWriter,
  ResearchWriteStory,
} from "@/modules/pipeline/research-writer";

/**
 * Pipeline research writer that notifies open Dashboard views after durable publish.
 * Keeps ResearchSurfaceStore free of Realtime concerns (deep module split).
 */
export class NotifyingPipelineResearchWriter implements PipelineResearchWriter {
  constructor(
    private readonly inner: PipelineResearchWriter,
    private readonly liveBus: ResearchLiveBus,
  ) {}

  async publishStories(stories: ResearchWriteStory[]): Promise<void> {
    await this.inner.publishStories(stories);
    const events = eventsFromPublishedStories(stories);
    if (events.length > 0) {
      await this.liveBus.publish(events);
    }
  }
}
