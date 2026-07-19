export type JobWorkspace = {
  readonly jobId: string;
  readonly rootPath: string;
  readonly inputDir: string;
  readonly outputDir: string;
  readonly sourcePngPath: string;
  readonly sourceJpegPath: string;
  readonly musicXmlPath: string;
  readonly omrPath: string;
  readonly logPath: string;
};
