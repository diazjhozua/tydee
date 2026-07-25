namespace Application.Users.Login;

public sealed record AuthTokensResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt);
