using HF.LearningCourseService.Core.Application.Mappers;
using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;

namespace HF.LearningCourseService.Core.Application.Services;

public class LearningCourseCategoryService : ILearningCourseCategoryService
{
    private readonly ILearningCourseCategoryRepository _repository;

    public LearningCourseCategoryService(ILearningCourseCategoryRepository repository)
    {
        _repository = repository;
    }

    public async Task<IList<LearningCourseCategoryDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(cancellationToken);
        return LearningCourseCategoryMapper.ToDtoList(entities);
    }

    public async Task<LearningCourseCategoryDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity != null ? LearningCourseCategoryMapper.ToDto(entity) : null;
    }

    public async Task<Guid> AddAsync(CreateLearningCourseCategoryDto request, CancellationToken cancellationToken = default)
    {
        var category = LearningCourseCategoryMapper.ToEntity(request);
        await _repository.AddAsync(category, cancellationToken);
        return category.Id;
    }

    public async Task UpdateAsync(UpdateLearningCourseCategoryDto request, CancellationToken cancellationToken = default)
    {
        var category = new LearningCourseCategory
        {
            Id = request.Id,
            Name = request.Name,
            Description = request.Description
        };

        await _repository.UpdateAsync(category, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteAsync(id, cancellationToken);
    }
}

