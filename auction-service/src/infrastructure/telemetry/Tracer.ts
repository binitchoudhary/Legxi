import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-node';
import { logger } from '../../shared/logger';

export class Tracer {
  private sdk?: NodeSDK;

  public init(): boolean {
    if (process.env.ENABLE_TELEMETRY !== 'true') {
      logger.info('Telemetry is disabled via ENABLE_TELEMETRY env var. Application continuing.');
      return false;
    }

    try {
      // Configuration driven entirely by environment variables
      const otlpUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
      const samplingRatio = parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG || '0.05');

      const traceExporter = new OTLPTraceExporter({
        url: otlpUrl,
      });

      this.sdk = new NodeSDK({
        traceExporter,
        sampler: new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(samplingRatio)
        }),
        instrumentations: [getNodeAutoInstrumentations()]
      });

      this.sdk.start();
      logger.info({ otlpUrl, samplingRatio }, 'OpenTelemetry SDK initialized successfully');
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        this.sdk?.shutdown().then(() => logger.info('Tracing terminated')).catch(logger.error);
      });

      return true;
    } catch (err) {
      logger.error({ err }, 'Failed to initialize OpenTelemetry. Application will continue without distributed tracing.');
      return false;
    }
  }

  public extractTraceHeaders(reqHeaders: any): { traceparent?: string; baggage?: string } {
    return {
      traceparent: reqHeaders['traceparent'] || reqHeaders['x-b3-traceid'],
      baggage: reqHeaders['baggage']
    };
  }
}
