using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Users.Me;
using Contracts.Users;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class GetMe : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/me", async (
            IUserContext userContext,
            IQueryHandler<GetMeQuery, MeResult> handler,
            CancellationToken cancellationToken) =>
        {
            Result<MeResult> result = await handler.Handle(
                new GetMeQuery(userContext.UserId),
                cancellationToken);

            return result.Match(
                me => Results.Ok(new MeResponse(me.Id, me.Email, me.FirstName, me.LastName, me.Currency)),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Get the current user's profile and preferences.")
        .RequireAuthorization();
    }
}
