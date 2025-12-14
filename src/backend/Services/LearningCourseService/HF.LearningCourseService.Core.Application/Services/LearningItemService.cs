using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;

namespace HF.LearningCourseService.Core.Application.Services;

public class LearningItemService : ILearningItemService
{
    private readonly ILearningArticleService _articleService;
    private readonly ILearningExerciseService _exerciseService;

    public LearningItemService(
        ILearningArticleService articleService,
        ILearningExerciseService exerciseService)
    {
        _articleService = articleService;
        _exerciseService = exerciseService;
    }

    public async Task<IList<LearningItemDto>> GetItemsByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default)
    {
        var articlesTask = _articleService.GetByModuleIdAsync(moduleId, cancellationToken);
        var exercisesTask = _exerciseService.GetByModuleIdAsync(moduleId, cancellationToken);

        await Task.WhenAll(articlesTask, exercisesTask);

        var articles = await articlesTask;
        var exercises = await exercisesTask;

        var items = new List<LearningItemDto>();

        // Convert articles to LearningItemDto
        foreach (var article in articles)
        {
            items.Add(new LearningItemDto
            {
                Id = article.Id,
                LearningModuleId = article.LearningModuleId,
                Title = article.Title,
                Description = article.Description,
                Number = article.Number,
                ItemType = LearningItemType.Article
            });
        }

        // Convert exercises to LearningItemDto
        foreach (var exercise in exercises)
        {
            items.Add(new LearningItemDto
            {
                Id = exercise.Id,
                LearningModuleId = exercise.LearningModuleId,
                Title = exercise.Title,
                Description = exercise.Description,
                Number = exercise.Number,
                ItemType = LearningItemType.Exercise
            });
        }

        // Sort by number
        return items.OrderBy(item => item.Number).ToList();
    }
}

