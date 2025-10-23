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
            LearningModuleId = dto.LearningModuleId
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
            ContentItems = entity.ContentItems.Select(LearningArticleContentItemMapper.ToDto).ToList()
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
        
        section.AddContentItems(dto.ContentItems.Select(LearningArticleContentItemMapper.ToEntity).ToList());
        return section;
    }

    public static IList<LearningArticleContentSection> ToEntityList(IEnumerable<LearningArticleContentSectionDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}

public static class LearningArticleContentItemMapper
{
    public static LearningArticleContentItemDto ToDto(LearningArticleContentItem entity)
    {
        return new LearningArticleContentItemDto
        {
            Content = entity.Content,
            Order = entity.Order,
            Type = entity.Type
        };
    }

    public static IList<LearningArticleContentItemDto> ToDtoList(IEnumerable<LearningArticleContentItem> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningArticleContentItem ToEntity(LearningArticleContentItemDto dto)
    {
        return new LearningArticleContentItem
        {
            Content = dto.Content,
            Order = dto.Order,
            Type = dto.Type
        };
    }

    public static IList<LearningArticleContentItem> ToEntityList(IEnumerable<LearningArticleContentItemDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}
