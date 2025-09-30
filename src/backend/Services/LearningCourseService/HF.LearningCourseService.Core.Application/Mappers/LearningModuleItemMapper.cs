using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningModuleItemMapper
{
    public static LearningModuleItemDto ToDto(LearningModuleItem entity)
    {
        return new LearningModuleItemDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Description = entity.Description,
            Type = entity.Type
        };
    }

    public static IList<LearningModuleItemDto> ToDtoList(IEnumerable<LearningModuleItem> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningModuleItem ToEntity(LearningModuleItemDto dto)
    {
        return new LearningModuleItem
        {
            Id = dto.Id,
            Title = dto.Title,
            Description = dto.Description,
            Type = dto.Type
        };
    }

    public static IList<LearningModuleItem> ToEntityList(IEnumerable<LearningModuleItemDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}

