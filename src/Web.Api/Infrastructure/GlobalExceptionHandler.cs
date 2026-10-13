using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Web.Api.Infrastructure;

internal sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // Malformed requests (unparseable query params, bad JSON bodies) are client
        // errors, not server failures — answer 400 instead of 500. The framework
        // signals these as BadHttpRequestException with the intended status code.
        if (exception is BadHttpRequestException badRequest)
        {
            int statusCode = badRequest.StatusCode is >= 400 and < 500
                ? badRequest.StatusCode
                : StatusCodes.Status400BadRequest;

            logger.LogWarning(exception, "Rejected malformed request");

            var badRequestDetails = new ProblemDetails
            {
                Status = statusCode,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                Title = "Bad request",
                Detail = badRequest.Message
            };

            httpContext.Response.StatusCode = statusCode;

            await httpContext.Response.WriteAsJsonAsync(badRequestDetails, cancellationToken);

            return true;
        }

        logger.LogError(exception, "Unhandled exception occurred");

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Type = "https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1",
            Title = "Server failure"
        };

        httpContext.Response.StatusCode = problemDetails.Status.Value;

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
