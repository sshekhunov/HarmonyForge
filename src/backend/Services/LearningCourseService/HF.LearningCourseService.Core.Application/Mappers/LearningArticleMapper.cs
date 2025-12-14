using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningArticleMapper
{
    public static LearningArticleDto ToDto(LearningArticle entity)
    {
        return new LearningArticleDto
        {
            Id = entity.Id,
            LearningModuleId = entity.LearningModuleId,
            Title = entity.Title,
            Description = entity.Description,
            Number = entity.Number,
            ContentSections = entity.ContentItems.Select(LearningArticleContentSectionMapper.ToDto).ToList()
        };
    }

    public static IList<LearningArticleDto> ToDtoList(IEnumerable<LearningArticle> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningArticle ToEntity(CreateLearningArticleDto dto)
    {
        var article = new LearningArticle
        {
            Id = Guid.NewGuid(),
            LearningModuleId = dto.LearningModuleId,
            Title = dto.Title,
            Description = dto.Description,
            Number = dto.Number
        };
        
        article.AddContentSections(dto.ContentSections.Select(LearningArticleContentSectionMapper.ToEntity).ToList());
        return article;
    }
}

public static class LearningArticleContentSectionMapper
{
    public static LearningArticleContentSectionDto ToDto(LearningArticleContentSection entity)
    {
        return new LearningArticleContentSectionDto
        {
            Title = entity.Title,
            Order = entity.Order,
            ContentItems = entity.ContentItems.Select(LearningContentItemMapper.ToDto).ToList()
        };
    }

    public static IList<LearningArticleContentSectionDto> ToDtoList(IEnumerable<LearningArticleContentSection> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningArticleContentSection ToEntity(LearningArticleContentSectionDto dto)
    {
        var section = new LearningArticleContentSection
        {
            Title = dto.Title,
            Order = dto.Order
        };
        
        section.AddContentItems(dto.ContentItems.Select(LearningContentItemMapper.ToEntity).ToList());
        return section;
    }

    public static IList<LearningArticleContentSection> ToEntityList(IEnumerable<LearningArticleContentSectionDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}

public static class LearningContentItemMapper
{
    public static LearningContentItemDto ToDto(LearningContentItem entity)
    {
        return new LearningContentItemDto
        {
            Content = entity.Content,
            Order = entity.Order,
            Type = entity.Type
        };
    }

    public static IList<LearningContentItemDto> ToDtoList(IEnumerable<LearningContentItem> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningContentItem ToEntity(LearningContentItemDto dto)
    {
        return new LearningContentItem
        {
            Content = dto.Content,
            Order = dto.Order,
            Type = dto.Type
        };
    }

    public static IList<LearningContentItem> ToEntityList(IEnumerable<LearningContentItemDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}
