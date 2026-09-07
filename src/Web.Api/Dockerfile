# syntax=docker/dockerfile:1

########################
# Build
########################
# Pinned to the SDK used by local dev: newer 10.0 feature bands add API-design
# analyzers that trip this repo's AnalysisMode=All + TreatWarningsAsErrors.
FROM mcr.microsoft.com/dotnet/sdk:10.0.400 AS build
WORKDIR /src

# Restore with the project graph so package/props files plus project refs
# (SharedKernel, Domain, Contracts, Application, Infrastructure) are pulled
# down once, before copying source.
COPY Directory.Build.props Directory.Packages.props tydee.slnx ./
COPY src/SharedKernel/SharedKernel.csproj src/SharedKernel/
COPY src/Domain/Domain.csproj src/Domain/
COPY src/Contracts/Contracts.csproj src/Contracts/
COPY src/Application/Application.csproj src/Application/
COPY src/Infrastructure/Infrastructure.csproj src/Infrastructure/
COPY src/Web.Api/Web.Api.csproj src/Web.Api/
RUN dotnet restore src/Web.Api/Web.Api.csproj

# Copy the rest and publish
COPY src/ src/
RUN dotnet publish src/Web.Api/Web.Api.csproj -c Release -o /app/publish --no-restore

########################
# Runtime
########################
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=5000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Web.Api.dll"]
