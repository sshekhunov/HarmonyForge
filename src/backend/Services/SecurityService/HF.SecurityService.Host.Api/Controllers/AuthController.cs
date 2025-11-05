using HF.SecurityService.CoreDomain.DTO;
using HF.SecurityService.CoreDomain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HF.SecurityService.Host.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            
            if (!result.IsSuccess)
            {
                var response = new { 
                    message = result.ErrorMessage,
                    passwordRequirements = result.PasswordRequirements 
                };
                return BadRequest(response);
            }

            return Ok(result.AuthResponse);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Произошла ошибка при регистрации." });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            
            if (result == null)
            {
                return Unauthorized(new { message = "Неверный email или пароль." });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Произошла ошибка при входе." });
        }
    }
}
