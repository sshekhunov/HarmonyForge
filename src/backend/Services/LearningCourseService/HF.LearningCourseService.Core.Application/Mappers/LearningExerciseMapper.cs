using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningExerciseMapper
{
    public static LearningExerciseDto ToDto(LearningExcercise entity)
    {
        return new LearningExerciseDto
        {
            Id = entity.Id,
            LearningModuleId = entity.LearningModuleId,
            Title = entity.Title,
            Description = entity.Description,
            Number = entity.Number,
            AppType = entity.AppType,
            AppVersion = entity.AppVersion,
            TaskContentItems = entity.TaskContentItems.Select(LearningContentItemMapper.ToDto).ToList(),
            TaskAppSettings = entity.TaskAppSettings
        };
    }

    public static IList<LearningExerciseDto> ToDtoList(IEnumerable<LearningExcercise> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningExcercise ToEntity(CreateLearningExerciseDto dto)
    {
        var exercise = new LearningExcercise
        {
            Id = Guid.NewGuid(),
            LearningModuleId = dto.LearningModuleId,
            Title = dto.Title,
            Description = dto.Description,
            Number = dto.Number,
            AppType = dto.AppType,
            AppVersion = dto.AppVersion,
            TaskAppSettings = dto.TaskAppSettings
        };
        
        exercise.AddTaskContentItems(dto.TaskContentItems.Select(LearningContentItemMapper.ToEntity).ToList());
        return exercise;
    }
}

