using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Users.ProcessNextPendingEmail;
using SharedKernel;

namespace Web.Api.Workers;

/// <summary>
/// Sends queued account emails (password reset links and verification resends). Every few seconds it checks for
/// due requests and, if there are any, processes up to <see cref="MaxRequestsPerTick"/> of them. Each request runs
/// in its own scope.
/// </summary>
internal sealed class PendingEmailWorker(
    IServiceScopeFactory scopeFactory,
    IDateTimeProvider dateTimeProvider,
    ILogger<PendingEmailWorker> logger)
    : BackgroundService
{
    private const int MaxRequestsPerTick = 20;

    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await DrainAsync(stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogError(exception, "Pending email worker tick failed");
            }
        }
    }

    private async Task DrainAsync(CancellationToken stoppingToken)
    {
        // Checked before starting a command, so an idle queue doesn't log a command pair every tick.
        if (!await HasDueEmailsAsync(stoppingToken))
        {
            return;
        }

        for (int i = 0; i < MaxRequestsPerTick; i++)
        {
            await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();

            ICommandHandler<ProcessNextPendingEmailCommand, bool> handler =
                scope.ServiceProvider.GetRequiredService<ICommandHandler<ProcessNextPendingEmailCommand, bool>>();

            Result<bool> result = await handler.Handle(new ProcessNextPendingEmailCommand(), stoppingToken);

            if (result.IsFailure || !result.Value)
            {
                return;
            }
        }
    }

    private async Task<bool> HasDueEmailsAsync(CancellationToken stoppingToken)
    {
        await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();

        IApplicationDbContext context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        return await context.HasPendingEmailsAsync(dateTimeProvider.UtcNow, stoppingToken);
    }
}
