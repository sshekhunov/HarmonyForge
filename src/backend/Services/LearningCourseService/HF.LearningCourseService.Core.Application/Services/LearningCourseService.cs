using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;

namespace HF.LearningCourseService.Core.Application.Services;

public class LearningCourseService: ILearningCourseService
{
    private readonly ILearningCourseRepository _repository;

    public LearningCourseService(ILearningCourseRepository repository)
    {
        _repository = repository;
    }

    public async Task<IList<LearningCourse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _repository.GetAllAsync(cancellationToken);
    }

    public async Task<LearningCourse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _repository.GetByIdAsync(id, cancellationToken);
    }

    public async Task<Guid> AddAsync(CreateCourseRequest request, CancellationToken cancellationToken = default)
    {
        var course = new LearningCourse
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description
        };

        await _repository.AddAsync(course, cancellationToken);
        return course.Id;
    }

    public async Task UpdateAsync(UpdateCourseRequest request, CancellationToken cancellationToken = default)
    {
        var course = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (course is null)
        {
            throw new Exception("Course not found");
        }
        course.Title = request.Title;
        course.Description = request.Description;

        await _repository.UpdateAsync(course, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteAsync(id,cancellationToken);
    }
}
