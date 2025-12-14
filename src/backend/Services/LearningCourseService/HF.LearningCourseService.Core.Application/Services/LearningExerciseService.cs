using HF.LearningCourseService.Core.Application.Mappers;
using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;

namespace HF.LearningCourseService.Core.Application.Services;

public class LearningExerciseService : ILearningExerciseService
{
    private readonly ILearningExerciseRepository _repository;

    public LearningExerciseService(ILearningExerciseRepository repository)
    {
        _repository = repository;
    }

    public async Task<IList<LearningExerciseDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(cancellationToken);
        return LearningExerciseMapper.ToDtoList(entities);
    }

    public async Task<LearningExerciseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity != null ? LearningExerciseMapper.ToDto(entity) : null;
    }

    public async Task<IList<LearningExerciseDto>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetByModuleIdAsync(moduleId, cancellationToken);
        return LearningExerciseMapper.ToDtoList(entities);
    }

    public async Task<Guid> AddAsync(CreateLearningExerciseDto request, CancellationToken cancellationToken = default)
    {
        var exercise = LearningExerciseMapper.ToEntity(request);
        await _repository.AddAsync(exercise, cancellationToken);
        return exercise.Id;
    }

    public async Task UpdateAsync(UpdateLearningExerciseDto request, CancellationToken cancellationToken = default)
    {
        var exercise = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (exercise is null)
        {
            throw new InvalidOperationException($"Learning exercise with ID {request.Id} not found");
        }       
        
        exercise.LearningModuleId = request.LearningModuleId;
        exercise.Title = request.Title;
        exercise.Description = request.Description;
        exercise.Number = request.Number;
        exercise.AppType = request.AppType;
        exercise.AppVersion = request.AppVersion;
        exercise.TaskAppSettings = request.TaskAppSettings;
        exercise.ClearTaskContentItems();
        exercise.AddTaskContentItems(request.TaskContentItems.Select(LearningContentItemMapper.ToEntity).ToList());

        await _repository.UpdateAsync(exercise, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteAsync(id, cancellationToken);
    }
}

