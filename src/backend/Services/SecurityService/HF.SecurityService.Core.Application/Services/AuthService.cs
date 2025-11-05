using HF.SecurityService.CoreDomain.DTO;
using HF.SecurityService.CoreDomain.Entities;
using HF.SecurityService.CoreDomain.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace HF.SecurityService.Core.Application.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _configuration;
    private readonly PasswordOptions _passwordOptions;

    public AuthService(
        UserManager<User> userManager, 
        IConfiguration configuration,
        IOptions<IdentityOptions> identityOptions)
    {
        _userManager = userManager;
        _configuration = configuration;
        _passwordOptions = identityOptions.Value.Password;
    }

    public async Task<RegisterResultDto> RegisterAsync(RegisterRequestDto request)
    {       
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return new RegisterResultDto
            {
                IsSuccess = false,
                ErrorMessage = "Пользователь с таким email уже зарегистрирован"
            };
        }

        var user = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {           
            var passwordErrors = result.Errors
                .Where(e => e.Code.Contains("Password", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (passwordErrors.Any())
            {
                var requirements = GetPasswordRequirements();
                return new RegisterResultDto
                {
                    IsSuccess = false,
                    ErrorMessage = "Пароль не удовлетворяет требованиям безопасности",
                    PasswordRequirements = requirements
                };
            }

            return new RegisterResultDto
            {
                IsSuccess = false,
                ErrorMessage = string.Join("; ", result.Errors.Select(e => e.Description))
            };
        }

        var token = GenerateJwtToken(user);
        var expiresAt = DateTime.UtcNow.AddHours(24);

        return new RegisterResultDto
        {
            IsSuccess = true,
            AuthResponse = new AuthResponseDto
            {
                Token = token,
                UserId = user.Id.ToString(),
                Email = user.Email ?? string.Empty,
                UserName = user.UserName ?? string.Empty,
                ExpiresAt = expiresAt
            }
        };
    }

    public List<string> GetPasswordRequirements()
    {
        var requirements = new List<string>();

        requirements.Add($"Минимальная длина: {_passwordOptions.RequiredLength} символов");

        if (_passwordOptions.RequireDigit)
        {
            requirements.Add("Должен содержать хотя бы одну цифру (0-9)");
        }

        if (_passwordOptions.RequireLowercase)
        {
            requirements.Add("Должен содержать хотя бы одну строчную букву (a-z)");
        }

        if (_passwordOptions.RequireUppercase)
        {
            requirements.Add("Должен содержать хотя бы одну заглавную букву (A-Z)");
        }

        if (_passwordOptions.RequireNonAlphanumeric)
        {
            requirements.Add("Должен содержать хотя бы один специальный символ (!@#$%^&* и т.д.)");
        }

        return requirements;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return null;
        }

        var isValidPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!isValidPassword)
        {
            return null;
        }

        var token = GenerateJwtToken(user);
        var expiresAt = DateTime.UtcNow.AddHours(24);

        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id.ToString(),
            Email = user.Email ?? string.Empty,
            UserName = user.UserName ?? string.Empty,
            ExpiresAt = expiresAt
        };
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is not configured");
        var jwtAudience = _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience is not configured");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

