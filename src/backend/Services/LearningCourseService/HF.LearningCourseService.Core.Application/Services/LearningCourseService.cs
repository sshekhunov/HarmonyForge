using HF.LearningCourseService.Core.Application.Mappers;
using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;

namespace HF.LearningCourseService.Core.Application.Services;

public class LearningCourseService: ILearningCourseService
{
    private readonly ILearningCourseRepository _repository;
    private readonly ILearningCourseCategoryRepository _categoryRepository;

    public LearningCourseService(ILearningCourseRepository repository, ILearningCourseCategoryRepository categoryRepository)
    {
        _repository = repository;
        _categoryRepository = categoryRepository;
    }

    public async Task<IList<LearningCourseDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(cancellationToken);
        return LearningCourseMapper.ToDtoList(entities);
    }

    public async Task<LearningCourseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity != null ? LearningCourseMapper.ToDto(entity) : null;
    }

    public async Task<Guid> AddAsync(CreateCourseDto request, CancellationToken cancellationToken = default)
    {
        var course = LearningCourseMapper.ToEntity(request);        
        await _repository.AddAsync(course, cancellationToken);
        return course.Id;
    }

    public async Task UpdateAsync(UpdateCourseDto request, CancellationToken cancellationToken = default)
    {
        var course = await _repository.GetByIdForUpdateAsync(request.Id, cancellationToken);
        if (course is null)
        {
            throw new InvalidOperationException($"Learning course with ID {request.Id} not found");
        }
        
        course.Code = request.Code;
        course.Title = request.Title;
        course.Description = request.Description;
        course.CategoryId = request.CategoryId;

        course.ClearModules();
        course.AddModules(request.Modules.Select(LearningModuleMapper.ToEntity).ToList());

        await _repository.UpdateAsync(course, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteAsync(id, cancellationToken);
    }
}
